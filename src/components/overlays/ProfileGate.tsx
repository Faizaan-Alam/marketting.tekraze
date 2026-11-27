"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Member } from "@/content/schema";
import { displayRole } from "@/content/team";
import { Avatar } from "@/components/ui/Avatar";
import { setUi, useUi } from "@/lib/client/store";
import { playCue } from "@/lib/client/sound";
import { readSession, useBrowserValue } from "@/lib/client/capabilities";

const KEY = "tz-profile";
const SLUG = /^[a-z0-9-]{1,40}$/;

/**
 * "Who's watching?" — a cosmetic profile picker. Choosing a profile does NOT sign anyone in; it
 * only personalises the greeting for this browser tab (sessionStorage) and plays the zoom-through
 * transition into the browse page.
 */
export function ProfileGate({ members }: { members: ReadonlyArray<Member> }) {
  const bootDone = useUi((s) => s.bootDone);
  const stored = useBrowserValue(() => readSession(KEY), null);
  const hasProfile = stored !== null && SLUG.test(stored);
  const [dismissed, setDismissed] = useState(false);
  const open = !hasProfile && !dismissed;
  const [picked, setPicked] = useState<string | null>(null);
  const firstTile = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasProfile && stored) setUi({ profile: stored, gateOpen: false });
    else if (!dismissed) setUi({ gateOpen: true });
  }, [hasProfile, stored, dismissed]);

  useEffect(() => {
    if (open && bootDone) firstTile.current?.focus({ preventScroll: true });
  }, [open, bootDone]);

  const choose = (slug: string, target: HTMLElement | null) => {
    if (picked) return;
    playCue("open");
    try {
      window.sessionStorage.setItem(KEY, slug);
    } catch {
      /* ignore */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPicked(slug);
    // Zoom-through: grow the chosen tile to fill the screen, then reveal the page.
    if (target && root.current && !reduced) {
      const r = target.getBoundingClientRect();
      const scale = Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.25;
      const dx = window.innerWidth / 2 - (r.left + r.width / 2);
      const dy = window.innerHeight / 2 - (r.top + r.height / 2);
      target.animate(
        [
          { transform: "none", filter: "none" },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, filter: "blur(2px)" },
        ],
        { duration: 850, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" },
      );
      root.current.animate([{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], {
        duration: 950,
        easing: "ease-out",
        fill: "forwards",
      });
    }
    window.setTimeout(
      () => {
        document.documentElement.setAttribute("data-profile", slug);
        setDismissed(true);
        setUi({ profile: slug, gateOpen: false });
        const heading = document.getElementById("hero-title");
        heading?.focus({ preventScroll: true });
      },
      reduced ? 0 : 950,
    );
  };

  const tilt = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 18).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const untilt = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

  if (!open) return null;

  return (
    <div
      ref={root}
      className="profile-gate fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-y-auto bg-ink px-[var(--gutter)] py-16"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      aria-describedby="gate-desc"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgb(242_36_58/0.14),transparent_70%)]" />
      <h2 id="gate-title" className="display relative text-center text-[clamp(2.6rem,7vw,5.6rem)]">
        Who&rsquo;s watching?
      </h2>
      <p id="gate-desc" className="relative mt-3 max-w-[46ch] text-center text-paper-dim">
        Pick a host for your tour of Tekraze Studio. Just for fun: there&rsquo;s no account and
        nothing to sign in to.
      </p>
      <ul
        className="relative mt-10 grid w-full max-w-4xl grid-cols-3 gap-[clamp(0.75rem,3vw,2.5rem)]"
        role="list"
      >
        {members.map((m, i) => (
          <li key={m.slug} className="[perspective:900px]">
            <button
              ref={i === 0 ? firstTile : undefined}
              type="button"
              onClick={(e) => choose(m.slug, e.currentTarget)}
              onPointerMove={tilt}
              onPointerLeave={untilt}
              onFocus={() => playCue("tick")}
              className="profile-tile group block w-full text-center"
              style={{ ["--hue" as string]: m.hue } as CSSProperties}
              disabled={picked !== null}
            >
              <span className="profile-tile__card relative block aspect-square w-full overflow-hidden rounded-[clamp(0.6rem,1.4vw,1.1rem)]">
                <Avatar
                  member={m}
                  sizes="(max-width: 640px) 30vw, 260px"
                  className="absolute inset-0"
                  decorative
                  priority
                />
                <span className="profile-tile__sheen absolute inset-0" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-[clamp(0.95rem,1.8vw,1.25rem)] font-semibold text-paper-dim transition-colors group-hover:text-paper group-focus-visible:text-paper">
                <span className="sr-only">Continue as </span>
                {m.name}
              </span>
              <span className="profile-tile__role mt-0.5 block text-sm text-paper-faint">
                {displayRole(m)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-ghost relative mt-12 text-sm"
        onClick={() => choose("guest", null)}
        disabled={picked !== null}
      >
        Skip, just browse
      </button>
    </div>
  );
}
