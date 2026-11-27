"use client";

import { useEffect, useRef, useState } from "react";
import { bootSnapshot, trackBoot } from "@/lib/client/boot";
import { setUi } from "@/lib/client/store";
import { readSession, useBrowserValue } from "@/lib/client/capabilities";

const SEEN_KEY = "tz-boot";
const MIN_MS = 1500;
const MIN_MS_REDUCED = 350;
const MAX_MS = 9000;

/**
 * The intro "ident": a red TEKRAZE wordmark with a live percentage tied to real asset loading.
 * Shown once per session, skippable, and shortened for reduced-motion users. Rendered on the
 * server too, so it covers the page from the first paint (CSS hides it for returning visitors).
 */
export function BootSequence() {
  const seenBefore = useBrowserValue(() => readSession(SEEN_KEY) === "1", false);
  const [phase, setPhase] = useState<"loading" | "opening" | "gone">("loading");
  const [percent, setPercent] = useState(0);
  const shown = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    if (seenBefore) {
      setUi({ bootDone: true });
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    trackBoot("fonts", document.fonts.ready);

    let raf = 0;
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      try {
        window.sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      setPercent(100);
      setPhase("opening");
      window.setTimeout(
        () => {
          setPhase("gone");
          document.documentElement.setAttribute("data-boot", "seen");
          setUi({ bootDone: true });
        },
        reduced ? 150 : 900,
      );
    };

    // Animate the counter toward the real ratio; never ahead of it.
    const tick = () => {
      const { done, total } = bootSnapshot();
      const real = total === 0 ? 0 : done / total;
      shown.current += (real * 100 - shown.current) * 0.12;
      setPercent(Math.min(99, Math.floor(shown.current)));
      const elapsed = performance.now() - start;
      const minMs = reduced ? MIN_MS_REDUCED : MIN_MS;
      if (
        (total > 0 && done === total && elapsed > minMs && shown.current > 97) ||
        elapsed > MAX_MS
      ) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const skip = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", skip);
    (window as Window & { __tzSkipBoot?: () => void }).__tzSkipBoot = finish;
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", skip);
    };
  }, [seenBefore]);

  if (phase === "gone" || seenBefore) return null;

  const skipNow = () => (window as Window & { __tzSkipBoot?: () => void }).__tzSkipBoot?.();

  return (
    <div
      className="boot-screen fixed inset-0 z-[90] grid place-items-center bg-ink"
      data-phase={phase}
      role="presentation"
    >
      <div className="boot-ident relative flex flex-col items-center">
        <p className="sr-only" role="status">
          {phase === "loading" ? "Loading Tekraze Studio" : "Ready"}
        </p>
        <div
          className="boot-wordmark display select-none text-[clamp(4.2rem,17vw,14rem)] leading-none text-tally"
          aria-hidden="true"
        >
          {"TEKRAZE".split("").map((ch, i) => (
            <span key={i} className="boot-letter inline-block" style={{ ["--i" as string]: i }}>
              {ch}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-4 text-paper-dim" aria-hidden="true">
          <span className="tally-dot animate-tally" />
          <span className="font-display text-xl tabular-nums tracking-wide">
            {String(percent).padStart(2, "0")}%
          </span>
          <span className="text-sm">Studio is warming up</span>
        </div>
        <div
          className="boot-bar mt-4 h-px w-[min(22rem,70vw)] overflow-hidden bg-line"
          aria-hidden="true"
        >
          <div
            className="h-full bg-tally transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={skipNow}
        className="btn btn-ghost absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[var(--gutter)] text-sm"
      >
        Skip intro
      </button>
    </div>
  );
}
