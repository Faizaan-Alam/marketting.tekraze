"use client";

import { m } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/Icons";
import { useModal } from "@/lib/client/focus";

/**
 * Accessible modal shell: focus trap, Esc to close, scroll lock, focus returned on close.
 * Rendered through a portal on <body> so transformed ancestors (3D rows) can never trap it.
 */
export function ModalFrame({
  labelledBy,
  onClose,
  returnTo,
  children,
  wide = false,
}: {
  labelledBy: string;
  onClose: () => void;
  returnTo: HTMLElement | null;
  children: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useModal(panel, true, onClose, returnTo);
  return createPortal(
    <div className="fixed inset-0 z-[75] overflow-y-auto overscroll-contain" data-lenis-prevent>
      <m.div
        className="fixed inset-0 bg-ink/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="pointer-events-none relative flex min-h-full items-start justify-center px-3 py-6 sm:px-6 sm:py-12">
        <m.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className={`pointer-events-auto relative w-full overflow-hidden rounded-[1rem] bg-ink-2 shadow-[0_2rem_6rem_-1rem_rgb(0_0_0/0.9)] outline-none ring-1 ring-line ${wide ? "max-w-6xl" : "max-w-4xl"}`}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-ink/70 text-paper backdrop-blur hover:bg-ink"
            aria-label="Close"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
          {children}
        </m.div>
      </div>
    </div>,
    document.body,
  );
}
