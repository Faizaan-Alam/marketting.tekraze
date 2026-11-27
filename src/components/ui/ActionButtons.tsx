"use client";

import type { ReactNode } from "react";
import { openService, requestQuote } from "@/lib/client/store";
import { scrollToId } from "@/lib/client/motion";
import { playCue } from "@/lib/client/sound";

type Base = { className?: string; children: ReactNode };

/** Scrolls to the enquiry form and pre-selects `service` (null = no pre-selection). */
export function QuoteButton({
  service = null,
  className,
  children,
}: Base & { service?: string | null }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        playCue("confirm");
        requestQuote(service);
      }}
    >
      {children}
    </button>
  );
}

export function OpenServiceButton({ slug, className, children }: Base & { slug: string }) {
  return (
    <button
      type="button"
      className={className}
      data-cursor="view"
      onClick={(e) => {
        playCue("open");
        openService(slug, e.currentTarget);
      }}
    >
      {children}
    </button>
  );
}

export function ScrollButton({ target, className, children }: Base & { target: string }) {
  return (
    <a
      href={`#${target}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        scrollToId(target);
      }}
    >
      {children}
    </a>
  );
}
