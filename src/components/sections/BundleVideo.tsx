"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Muted ambient clip behind the bundle billboard. Loads only near the viewport, and stops after
 * five seconds so it never needs a pause control (WCAG 2.2.2).
 */
export function BundleVideo({ src, poster }: { src: string; poster: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        const visible = e?.isIntersecting ?? false;
        if (visible && !reduced) setLoad(true);
        const v = video.current;
        if (v) {
          if (!visible) v.pause();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- pre-optimised poster frame
        <img
          src={poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
      ) : null}
      {load ? (
        <video
          ref={video}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
          src={src}
          muted
          playsInline
          autoPlay
          preload="metadata"
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime > 4.8) e.currentTarget.pause();
          }}
          aria-hidden="true"
          tabIndex={-1}
        />
      ) : null}
    </div>
  );
}
