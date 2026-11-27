"use client";

import { useEffect, useRef } from "react";
import { processSteps } from "@/content/site";
import { ensureGsap, ScrollTrigger } from "@/lib/client/motion";

/**
 * How it works, as a watch queue: Ep.1 Enquire → Ep.5 Deliver. A progress bar fills as you
 * scroll through the section and each episode lights up when reached. Static without motion.
 */
export function ProcessQueue() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !document.documentElement.classList.contains("motion-ok")) return;
    ensureGsap();
    const bar = el.querySelector<HTMLElement>("[data-queue-bar]");
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-queue-item]"));
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 70%",
      end: "bottom 60%",
      onUpdate: (self) => {
        if (bar) bar.style.transform = `scaleX(${self.progress.toFixed(3)})`;
        items.forEach((item, i) => {
          item.dataset.reached = String(self.progress >= i / items.length + 0.02);
        });
      },
    });
    return () => st.kill();
  }, []);

  return (
    <section
      ref={root}
      id="process"
      aria-labelledby="process-title"
      className="py-[clamp(3rem,8vw,6rem)]"
    >
      <div className="gutter">
        <p className="text-sm font-semibold text-tally">Up next</p>
        <h2 id="process-title" className="display mt-2 text-[clamp(2.6rem,6vw,4.8rem)]">
          How it works
        </h2>
        <p className="measure mt-3 text-paper-dim">Five episodes from first message to handover.</p>
        <div
          className="relative mt-10 h-[3px] overflow-hidden rounded bg-paper/15"
          aria-hidden="true"
        >
          <div
            data-queue-bar
            className="absolute inset-0 origin-left scale-x-0 bg-tally motion-reduce:scale-x-100"
          />
        </div>
      </div>
      <ol className="row-track mt-2" role="list" aria-label="Process steps">
        {processSteps.map((s) => (
          <li
            key={s.step}
            data-queue-item
            data-reached="false"
            className="queue-item w-[min(20rem,78vw)] rounded-[0.9rem] border border-line bg-ink-2 p-5"
          >
            <p className="flex items-baseline justify-between">
              <span className="font-display text-xl font-bold text-paper-faint">Ep. {s.step}</span>
              <span className="queue-dot tally-dot" aria-hidden="true" />
            </p>
            <h3 className="display mt-6 text-[2.6rem]">{s.title}</h3>
            <p className="mt-2 text-paper-dim">{s.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
