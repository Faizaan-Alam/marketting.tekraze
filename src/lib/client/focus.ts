"use client";
import { useEffect, type RefObject } from "react";
import { getLenis } from "./motion";

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("inert") && el.getClientRects().length > 0,
  );
}

/**
 * Modal behaviour: traps Tab inside `ref`, closes on Escape, locks page scroll (Lenis + native),
 * and returns focus to `returnTo` (or the previously focused element) when it closes.
 */
export function useModal(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
  returnTo?: HTMLElement | null,
): void {
  useEffect(() => {
    if (!active) return;
    const previous = returnTo ?? (document.activeElement as HTMLElement | null);
    const root = ref.current;
    const lenis = getLenis();
    lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      if (!root) return;
      const auto = root.querySelector<HTMLElement>("[data-autofocus]");
      (auto ?? focusables(root)[0] ?? root).focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = focusables(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const current = document.activeElement;
      if (e.shiftKey && (current === first || !root.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !root.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [active, onClose, ref, returnTo]);
}
