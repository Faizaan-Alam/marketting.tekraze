"use client";

import dynamic from "next/dynamic";
import Lenis from "lenis";
import { useEffect, useState } from "react";
import { SearchOverlay } from "./SearchOverlay";
import { CustomCursor } from "./CustomCursor";
import { SafeBoundary } from "@/components/ui/SafeBoundary";
import { detectCapabilities } from "@/lib/client/capabilities";
import { ensureGsap, scrollState, ScrollTrigger, setLenis } from "@/lib/client/motion";
import { useUi } from "@/lib/client/store";

const PosterHoverGL = dynamic(() => import("@/components/three/PosterHoverGL"), { ssr: false });

/** Smooth scrolling on the shared ticker. Off for reduced motion; native keys/anchors keep working. */
function useSmoothScroll(): void {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gsap = ensureGsap();
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.11,
      smoothWheel: true,
      anchors: { offset: -72 },
      prevent: (node) => node.closest("[data-lenis-prevent]") !== null,
    });
    setLenis(lenis);
    lenis.on("scroll", (l: Lenis) => {
      scrollState.velocity = l.velocity;
      ScrollTrigger.update();
    });
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      setLenis(null);
    };
  }, []);
}

/** While the intro or profile screen is up, the page behind it is inert (not focusable). */
function useInertBackground(): void {
  const bootDone = useUi((s) => s.bootDone);
  const gateOpen = useUi((s) => s.gateOpen);
  const blocked = !bootDone || gateOpen;
  useEffect(() => {
    const els = [
      document.querySelector("header"),
      document.getElementById("main"),
      document.querySelector("footer"),
    ];
    for (const el of els) if (el) el.inert = blocked;
    return () => {
      for (const el of els) if (el) el.inert = false;
    };
  }, [blocked]);
}

export function ClientEffects() {
  useSmoothScroll();
  useInertBackground();
  const [glHover, setGlHover] = useState(false);
  useEffect(() => {
    const caps = detectCapabilities();
    if (caps.tier !== "high") return;
    const start = () => setGlHover(true);
    // Load the hover shader only after the page is idle.
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(start);
    else window.setTimeout(start, 1500);
  }, []);
  return (
    <>
      <SearchOverlay />
      <CustomCursor />
      {glHover ? (
        <SafeBoundary>
          <PosterHoverGL />
        </SafeBoundary>
      ) : null}
    </>
  );
}
