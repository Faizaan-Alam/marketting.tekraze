"use client";

import { useEffect, useRef } from "react";
import { useBrowserValue } from "@/lib/client/capabilities";
import { ensureGsap } from "@/lib/client/motion";

/**
 * A small dot that becomes a labelled ring over cards ("View") and videos ("Play").
 * Only for fine pointers without reduced motion. The native cursor is hidden only while the
 * mouse is in use; any key press brings it back and hides the custom one.
 */
export function CustomCursor() {
  const enabled = useBrowserValue(
    () =>
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    false,
  );
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!enabled || !dot.current || !ring.current) return;
    const gsap = ensureGsap();
    const html = document.documentElement;
    html.classList.add("has-cursor");
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "power3" });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "power3" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.35, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.35, ease: "power3" });
    let mode = "";

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      html.classList.add("pointer-active");
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest<HTMLElement>(
        "[data-cursor], video, a, button, summary, select, input, textarea",
      );
      let next = "";
      if (target?.dataset.cursor === "view") next = "View";
      else if (target?.dataset.cursor === "play" || target?.tagName === "VIDEO") next = "Play";
      else if (target) next = "link";
      if (next === mode) return;
      mode = next;
      ring.current?.setAttribute(
        "data-mode",
        next === "View" || next === "Play" ? "label" : next === "link" ? "link" : "",
      );
      if (label.current) label.current.textContent = next === "link" ? "" : next;
    };
    const keyboard = () => html.classList.remove("pointer-active");
    const leave = () => html.classList.remove("pointer-active");

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("keydown", keyboard);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      window.removeEventListener("keydown", keyboard);
      document.documentElement.removeEventListener("pointerleave", leave);
      html.classList.remove("has-cursor", "pointer-active");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden="true" className="cursor-layer">
      <div ref={ring} className="cursor-ring">
        <span ref={label} className="cursor-label" />
      </div>
      <div ref={dot} className="cursor-dot" />
    </div>
  );
}
