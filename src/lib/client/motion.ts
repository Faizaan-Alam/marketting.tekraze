"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

/**
 * One animation loop for the whole site: GSAP's ticker (requestAnimationFrame) drives Lenis,
 * ScrollTrigger and every R3F canvas (which run with frameloop="never" and are advanced here).
 */
let registered = false;
let lenisInstance: Lenis | null = null;

export function ensureGsap(): typeof gsap {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    gsap.ticker.lagSmoothing(0);
    registered = true;
  }
  return gsap;
}

export function setLenis(instance: Lenis | null): void {
  lenisInstance = instance;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

/** Smooth-scroll to an element id, falling back to native scrolling; moves focus for a11y. */
export function scrollToId(id: string, options: { focus?: boolean } = {}): void {
  if (!/^[a-z0-9-]{1,64}$/.test(id)) return;
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = lenisInstance;
  if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.1 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (options.focus !== false) {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
}

/** Shared scroll velocity (px/frame), written by Lenis, read by the marquee. */
export const scrollState = { velocity: 0, progress: 0 };

/** Shared hero trailer progress 0..1 (written by ScrollTrigger, read by the 3D scene). */
export const trailerState = { progress: 0, pointerX: 0, pointerY: 0 };

export { gsap, ScrollTrigger };

/** Run `cb` once no modal is open and smooth scrolling is running again (max ~2 s). */
export function afterModalsClose(cb: () => void): () => void {
  let raf = 0;
  const started = performance.now();
  const check = () => {
    const open = document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
    const stopped = lenisInstance?.isStopped === true;
    if ((!open && !stopped) || performance.now() - started > 2000) {
      cb();
      return;
    }
    raf = requestAnimationFrame(check);
  };
  raf = requestAnimationFrame(check);
  return () => cancelAnimationFrame(raf);
}
