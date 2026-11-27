"use client";

import { useEffect, useRef } from "react";
import { ensureGsap, scrollState } from "@/lib/client/motion";

/**
 * Infinite wordmark strip. Its speed follows scroll velocity (Lenis), and it reverses with
 * scroll direction. Decorative: hidden from assistive tech, static for reduced motion.
 */
export function Marquee({
  words,
  reverse = false,
}: {
  words: ReadonlyArray<string>;
  reverse?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || !document.documentElement.classList.contains("motion-ok")) return;
    const gsap = ensureGsap();
    const tween = gsap.fromTo(
      el,
      { xPercent: reverse ? -50 : 0 },
      { xPercent: reverse ? 0 : -50, duration: 38, ease: "none", repeat: -1 },
    );
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e?.isIntersecting ?? false;
      if (visible) tween.play();
      else tween.pause();
    });
    io.observe(el);
    const tick = () => {
      if (!visible) return;
      const v = scrollState.velocity;
      const target = (1 + Math.min(Math.abs(v) * 0.35, 6)) * (v < -0.2 ? -1 : 1);
      tween.timeScale(gsap.utils.interpolate(tween.timeScale(), target, 0.08));
    };
    gsap.ticker.add(tick);
    return () => {
      io.disconnect();
      gsap.ticker.remove(tick);
      tween.kill();
    };
  }, [reverse]);

  const line = (
    <span className="flex shrink-0 items-center">
      {words.map((w) => (
        <span key={w} className="flex items-center">
          <span className="display px-[0.35em] text-[clamp(3.5rem,11vw,9.5rem)] text-transparent [-webkit-text-stroke:1.5px_rgb(238_232_225/0.55)]">
            {w}
          </span>
          <span className="tally-dot mx-[0.2em] text-[clamp(2rem,4vw,3.5rem)]" />
        </span>
      ))}
    </span>
  );

  return (
    <div
      className="relative overflow-hidden border-y border-line py-[clamp(0.75rem,2vw,1.5rem)]"
      aria-hidden="true"
    >
      <div ref={track} className="marquee-track">
        {line}
        {line}
        {line}
        {line}
      </div>
    </div>
  );
}
