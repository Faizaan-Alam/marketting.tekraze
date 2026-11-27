"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { requestQuote, useUi } from "@/lib/client/store";

/** Sticky "Get a free quote" on small screens, so the main action is always one tap away. */
export function MobileQuoteBar() {
  const [hidden, setHidden] = useState(false);
  const bootDone = useUi((s) => s.bootDone);
  useEffect(() => {
    const form = document.getElementById("quote");
    if (!form) return;
    const io = new IntersectionObserver(([e]) => setHidden(e?.isIntersecting ?? false), {
      threshold: 0.15,
    });
    io.observe(form);
    return () => io.disconnect();
  }, []);
  if (!bootDone) return null;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 md:hidden ${
        hidden ? "translate-y-full" : ""
      }`}
      aria-hidden={hidden || undefined}
    >
      <button
        type="button"
        className="btn btn-primary w-full"
        tabIndex={hidden ? -1 : undefined}
        onClick={() => requestQuote(null)}
      >
        {site.primaryCta}
      </button>
    </div>
  );
}
