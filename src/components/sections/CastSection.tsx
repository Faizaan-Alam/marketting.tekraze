"use client";

import { useEffect, useRef } from "react";
import type { Member } from "@/content/schema";
import { displayRole } from "@/content/team";
import { Avatar } from "@/components/ui/Avatar";
import { SocialIcon } from "@/components/ui/Icons";
import { ensureGsap } from "@/lib/client/motion";

/** Meet the Team as end credits: "Starring …", with portraits drifting at different depths. */
export function CastSection({ members }: { members: ReadonlyArray<Member> }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !document.documentElement.classList.contains("motion-ok")) return;
    const gsap = ensureGsap();
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-depth]").forEach((p) => {
        const depth = Number(p.dataset.depth ?? "1");
        gsap.fromTo(
          p,
          { yPercent: 12 * depth },
          {
            yPercent: -12 * depth,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      id="team"
      aria-labelledby="team-title"
      className="relative overflow-hidden py-[clamp(4rem,10vw,8rem)]"
    >
      <div className="gutter text-center">
        <h2 id="team-title" className="text-sm font-semibold text-tally">
          Meet the team
        </h2>
        <p className="mt-4 font-display text-2xl font-bold tracking-[0.3em] text-paper-dim">
          STARRING
        </p>
        <p className="display mx-auto mt-3 max-w-[18ch] text-[clamp(2.6rem,7vw,5.8rem)]">
          {members.map((m, i) => (
            <span key={m.slug}>
              {m.name}
              {i < members.length - 2 ? ", " : i === members.length - 2 ? " & " : ""}
            </span>
          ))}
        </p>
      </div>
      <ul
        className="gutter mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-6"
        role="list"
      >
        {members.map((m, i) => (
          <li key={m.slug} className="text-center" data-depth={i === 1 ? "1.6" : "0.8"}>
            <Avatar
              member={m}
              sizes="(max-width: 640px) 80vw, 340px"
              className="mx-auto aspect-[4/5] w-full max-w-[22rem] rounded-[1rem]"
            />
            <h3 className="mt-5 text-xl font-semibold">{m.name}</h3>
            <p className="mt-1 text-sm text-paper-dim">{displayRole(m)}</p>
            {m.bio ? (
              <p className="mx-auto mt-3 max-w-[38ch] text-sm text-paper-dim">{m.bio}</p>
            ) : null}
            {m.socials.length > 0 ? (
              <ul className="mt-3 flex justify-center gap-2" role="list">
                {m.socials.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-10 w-10 place-items-center rounded-full border border-line text-paper-dim hover:text-paper"
                      aria-label={`${m.name} on ${s.label} (opens in a new tab)`}
                    >
                      <SocialIcon network={s.network} className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
