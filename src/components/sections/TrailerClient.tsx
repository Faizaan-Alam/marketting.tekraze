"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { expectBoot, resolveBoot, trackBoot } from "@/lib/client/boot";
import { useCapabilities } from "@/lib/client/capabilities";
import { ensureGsap, scrollToId, ScrollTrigger, trailerState } from "@/lib/client/motion";
import { useUi } from "@/lib/client/store";
import { heroFrameUrl } from "@/lib/media";
import { SafeBoundary } from "@/components/ui/SafeBoundary";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

const FRAME_START = 0.1;
const FRAME_END = 0.87;

/**
 * Background media.
 *  billboard — poster → muted loop (+ the 3D deck on high-tier devices); these are the first-screen
 *              assets the intro waits for.
 *  trailer   — poster → scroll-scrubbed frame sequence + the 3D deck, loaded when it comes near.
 */
export function TrailerMedia({
  variant,
  poster,
  loop,
  frameCount,
  description,
}: {
  variant: "billboard" | "trailer";
  poster: string | null;
  loop: string | null;
  frameCount: number;
  description: string | null;
}) {
  const isBillboard = variant === "billboard";
  const caps = useCapabilities();
  const bootDone = useUi((s) => s.bootDone);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(isBillboard);
  const [near, setNear] = useState(isBillboard);
  const videoOn =
    isBillboard && caps.ready && loop !== null && !caps.reducedMotion && !caps.saveData;
  const sceneOn = caps.ready && near && (isBillboard ? caps.tier === "high" : caps.tier !== "low");

  // Decide what to load, and register real boot tasks for it.
  useEffect(() => {
    if (poster && isBillboard) {
      const img = new Image();
      img.src = poster;
      trackBoot("hero-poster", img.decode());
    }
  }, [poster, isBillboard]);
  useEffect(() => {
    if (!isBillboard) return;
    if (videoOn) expectBoot("hero-video");
    if (sceneOn) expectBoot("scene");
  }, [videoOn, sceneOn, isBillboard]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), {
      rootMargin: "0px",
    });
    // start loading the trailer's heavy layers one screen before they are needed
    const ioNear = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNear(true), {
      rootMargin: "100% 0px",
    });
    io.observe(el);
    ioNear.observe(el);
    return () => {
      io.disconnect();
      ioNear.disconnect();
    };
  }, []);

  // Pause the loop when it is off screen, hidden behind the frame sequence, or paused by the user.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused || !inView) v.pause();
    else void v.play().catch(() => undefined);
  }, [paused, inView, videoOn]);

  // Frame sequence: preload after the intro, draw from scroll progress on the shared ticker.
  useEffect(() => {
    if (isBillboard || !near || !bootDone || frameCount === 0 || !caps.ready) return;
    if (caps.tier === "low" || caps.saveData) return;
    if (!document.documentElement.classList.contains("motion-ok")) return;
    const cvs = canvas.current;
    const ctx = cvs?.getContext("2d", { alpha: false });
    if (!cvs || !ctx) return;
    const frames: Array<HTMLImageElement | null> = new Array(frameCount).fill(null);
    let cancelled = false;
    let next = 1;
    const loadOne = async (): Promise<void> => {
      while (!cancelled && next <= frameCount) {
        const n = next++;
        const url = heroFrameUrl(n);
        if (!url) continue;
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        try {
          await img.decode();
          frames[n - 1] = img;
        } catch {
          /* skip a missing frame */
        }
      }
    };
    void Promise.all([loadOne(), loadOne(), loadOne(), loadOne()]);

    const gsap = ensureGsap();
    let lastIndex = -1;
    const draw = () => {
      const p = trailerState.progress;
      const t = Math.min(1, Math.max(0, (p - FRAME_START) / (FRAME_END - FRAME_START)));
      const fade = Math.min(1, Math.max(0, (p - 0.06) / 0.06));
      cvs.style.opacity = String(fade * 0.55);
      if (video.current) video.current.style.opacity = String(0.45 * (1 - fade));
      if (fade <= 0) return;
      let index = Math.round(t * (frameCount - 1));
      // nearest loaded frame
      while (index > 0 && !frames[index]) index -= 1;
      const img = frames[index];
      if (!img || index === lastIndex) return;
      lastIndex = index;
      const w = cvs.clientWidth;
      const h = cvs.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      if (cvs.width !== Math.round(w * dpr)) {
        cvs.width = Math.round(w * dpr);
        cvs.height = Math.round(h * dpr);
      }
      const scale = Math.max(cvs.width / img.naturalWidth, cvs.height / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (cvs.width - dw) / 2, (cvs.height - dh) / 2, dw, dh);
    };
    gsap.ticker.add(draw);
    return () => {
      cancelled = true;
      gsap.ticker.remove(draw);
    };
  }, [bootDone, frameCount, caps, isBillboard, near]);

  return (
    <div
      ref={root}
      className="trailer-media absolute inset-0 overflow-hidden"
      aria-hidden={description ? undefined : true}
    >
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- pre-optimised WebP, LCP candidate
        <img
          src={poster}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="media-blur absolute inset-0 h-full w-full object-cover opacity-45"
        />
      ) : (
        <div className="hero-fallback absolute inset-0" />
      )}
      {videoOn && loop ? (
        <video
          ref={video}
          className="media-blur absolute inset-0 h-full w-full object-cover opacity-45 transition-opacity duration-500"
          src={loop}
          poster={poster ?? undefined}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          onCanPlay={() => resolveBoot("hero-video")}
          onError={() => resolveBoot("hero-video")}
          aria-hidden="true"
          tabIndex={-1}
        />
      ) : null}
      <canvas
        ref={canvas}
        className="media-blur absolute inset-0 h-full w-full opacity-0"
        aria-hidden="true"
      />
      {sceneOn ? (
        <div className="absolute inset-0">
          <SafeBoundary onError={() => isBillboard && resolveBoot("scene")}>
            <HeroScene active={inView} onReady={() => isBillboard && resolveBoot("scene")} />
          </SafeBoundary>
        </div>
      ) : null}
      {description ? <p className="sr-only">Background video: {description}</p> : null}
      {videoOn ? (
        <button
          type="button"
          className="trailer-only absolute right-[var(--gutter)] top-[calc(var(--nav-h)+0.75rem)] z-10 rounded-full bg-ink/50 px-3 py-1.5 text-xs text-paper-dim backdrop-blur hover:text-paper"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "Play background video" : "Pause background video"}
        </button>
      ) : null}
    </div>
  );
}

/** Reads scroll progress and drives panel visibility + word reveals on the shared ticker. */
export function TrailerController({ bands }: { bands: number[] }) {
  const bootDone = useUi((s) => s.bootDone);
  const anchor = useRef<HTMLSpanElement>(null);

  // Play the billboard headline reveal once the intro is gone.
  useEffect(() => {
    if (!bootDone) return;
    if (!document.documentElement.classList.contains("motion-ok")) return;
    const words = document.querySelectorAll<HTMLElement>("#hero-title .reveal-word");
    words.forEach((w, i) => {
      w.animate(
        [
          { opacity: 0, transform: "translateY(0.35em)", filter: "blur(6px)" },
          { opacity: 1, transform: "none", filter: "none" },
        ],
        {
          duration: 800,
          delay: 80 * i,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "backwards",
        },
      );
    });
  }, [bootDone]);

  useEffect(() => {
    if (!document.documentElement.classList.contains("motion-ok")) return;
    const section = anchor.current?.closest<HTMLElement>(".trailer");
    if (!section) return;
    const gsap = ensureGsap();
    const panels = Array.from(section.querySelectorAll<HTMLElement>(".trailer-panel"));
    const words = panels.map((p) => Array.from(p.querySelectorAll<HTMLElement>(".reveal-word")));
    const rail = section.querySelectorAll<HTMLElement>("[data-rail-fill]");
    const railLabel = section.querySelector<HTMLElement>("[data-rail-label]");
    const labels = (section.querySelector<HTMLElement>("[data-rail]")?.dataset.labels ?? "").split(
      "|",
    );

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        trailerState.progress = self.progress;
      },
    });

    let smooth = 0;
    let lastLabel = -1;
    const update = () => {
      smooth += (trailerState.progress - smooth) * 0.18;
      const p = smooth;
      panels.forEach((panel, i) => {
        const start = bands[i] ?? 0;
        const end = bands[i + 1] ?? 1;
        const span = end - start;
        const local = (p - start) / span;
        let opacity: number;
        if (i === 0)
          opacity = p < end - span * 0.25 ? 1 : 1 - (p - (end - span * 0.25)) / (span * 0.25);
        else if (i === panels.length - 1) opacity = Math.min(1, local / 0.25);
        else opacity = Math.min(local / 0.22, (1 - local) / 0.2);
        opacity = Math.max(0, Math.min(1, opacity));
        panel.style.opacity = opacity.toFixed(3);
        panel.style.transform = `translate3d(0, ${((1 - opacity) * (local < 0.5 ? 40 : -40)).toFixed(1)}px, 0)`;
        const active = opacity > 0.02;
        if ((panel.dataset.active === "true") !== active) panel.dataset.active = String(active);
        if (i > 0) {
          const ws = words[i] ?? [];
          ws.forEach((w, k) => {
            const t = Math.max(0, Math.min(1, local * 3.2 - k * 0.22));
            w.style.opacity = (0.12 + t * 0.88).toFixed(3);
            w.style.transform = `translate3d(0, ${((1 - t) * 0.25).toFixed(3)}em, 0)`;
          });
        }
      });
      rail.forEach((fill, i) => {
        const start = bands[i] ?? 0;
        const end = bands[i + 1] ?? 1;
        const t = Math.max(0, Math.min(1, (p - start) / (end - start)));
        fill.style.transform = `scaleX(${t.toFixed(3)})`;
      });
      const current = bands.findIndex((b, i) => p >= b && p < (bands[i + 1] ?? 1.01));
      if (current !== lastLabel && railLabel) {
        lastLabel = current;
        railLabel.textContent =
          current <= 0
            ? "Season 1 trailer"
            : current >= panels.length - 1
              ? "Season finale"
              : `S1:E${current} ${labels[current] ?? ""}`;
      }
    };
    gsap.ticker.add(update);
    update();
    return () => {
      trigger.kill();
      gsap.ticker.remove(update);
    };
  }, [bands]);

  return <span ref={anchor} hidden />;
}

export function TrailerRail({ labels }: { labels: string[] }) {
  return (
    <div
      className="trailer-only pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden pb-[max(1.25rem,env(safe-area-inset-bottom))] md:block"
      data-rail
      data-labels={labels.join("|")}
    >
      <div className="gutter pointer-events-auto flex items-center gap-5">
        <span
          className="min-w-[12rem] font-display text-lg font-bold tracking-wide text-paper-dim"
          data-rail-label
          aria-hidden="true"
        >
          Season 1 trailer
        </span>
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {labels.map((l, i) => (
            <span
              key={l}
              className="relative h-[3px] flex-1 overflow-hidden rounded bg-paper/20"
              style={{ flexGrow: i === 0 ? 0.7 : 1 }}
            >
              <span data-rail-fill className="absolute inset-0 origin-left scale-x-0 bg-tally" />
            </span>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-ghost min-h-10 py-2 text-sm"
          onClick={() => scrollToId("growth-bundle")}
        >
          Skip trailer
        </button>
      </div>
    </div>
  );
}
