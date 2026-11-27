"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Category, Service } from "@/content/schema";
import { ChevronIcon } from "@/components/ui/Icons";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { VideoShowcaseCard } from "@/components/ui/VideoShowcaseCard";
import { showcaseFor } from "@/lib/media";

/**
 * A horizontal row (carousel). It is a plain scrollable list: touch-swipe, trackpad and the
 * prev/next buttons all scroll it; ←/→ move focus between cards. Far-edge cards bend away
 * slightly (curvature) while the row scrolls; reduced-motion users get a flat row.
 */
export function RowShell({
  id,
  title,
  kicker,
  description,
  children,
  label,
}: {
  id: string;
  title: ReactNode;
  kicker?: ReactNode;
  description?: string;
  children: ReactNode;
  label: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const motion = document.documentElement.classList.contains("motion-ok");
    let raf = 0;
    const bend = () => {
      raf = 0;
      if (!motion) return;
      const box = el.getBoundingClientRect();
      const centre = box.left + box.width / 2;
      for (const item of Array.from(el.children) as HTMLElement[]) {
        const r = item.getBoundingClientRect();
        const offset = (r.left + r.width / 2 - centre) / (box.width / 2);
        const edge = Math.max(0, Math.abs(offset) - 0.55) / 0.45;
        const clamped = Math.min(1, edge);
        item.style.transform =
          clamped > 0
            ? `rotateY(${(-Math.sign(offset) * clamped * 14).toFixed(2)}deg) translateZ(${(-clamped * 40).toFixed(1)}px)`
            : "";
        item.style.opacity = String(1 - clamped * 0.35);
      }
    };
    const onScroll = () => {
      measure();
      if (!raf) raf = requestAnimationFrame(bend);
    };
    bend();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const items = Array.from(track.current?.querySelectorAll<HTMLElement>("[data-row-item]") ?? []);
    const i = items.findIndex(
      (it) => it === document.activeElement || it.contains(document.activeElement),
    );
    const next = items[i + (e.key === "ArrowRight" ? 1 : -1)];
    if (next) {
      e.preventDefault();
      next.focus();
      next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  };

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      aria-roledescription="carousel"
      className="group/row relative py-5"
    >
      <div className="gutter mb-1 flex items-end justify-between gap-4">
        <div>
          {kicker ? <p className="text-sm font-semibold text-tally">{kicker}</p> : null}
          <h3 id={`${id}-title`} className="text-[clamp(1.25rem,2vw,1.6rem)] font-semibold">
            {title}
          </h3>
          {description ? (
            <p className="measure mt-1 text-sm text-paper-dim">{description}</p>
          ) : null}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-paper-dim transition hover:border-paper hover:text-paper disabled:opacity-30"
            onClick={() => page(-1)}
            disabled={edges.start}
            aria-label={`Scroll ${label} back`}
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-paper-dim transition hover:border-paper hover:text-paper disabled:opacity-30"
            onClick={() => page(1)}
            disabled={edges.end}
            aria-label={`Scroll ${label} forward`}
          >
            <ChevronIcon />
          </button>
        </div>
      </div>
      <ul ref={track} className="row-track" role="list" aria-label={label} onKeyDown={onKeyDown}>
        {children}
      </ul>
    </section>
  );
}

export function ServiceRow({
  category,
  services,
}: {
  category: Category;
  services: ReadonlyArray<Service>;
}) {
  return (
    <RowShell
      id={`row-${category.id}`}
      title={category.title}
      kicker={`Episode ${category.episode}`}
      description={category.logline}
      label={`${category.title} services`}
    >
      {services.map((s) => (
        <li
          key={s.slug}
          className="[transform-style:preserve-3d] transition-[opacity] duration-300"
        >
          <ServiceCard service={s} hue={category.hue} />
        </li>
      ))}
      {showcaseFor(category.id).map((v) => (
        <li key={v.id} className="[transform-style:preserve-3d] transition-[opacity] duration-300">
          <VideoShowcaseCard video={v} hue={category.hue} />
        </li>
      ))}
    </RowShell>
  );
}
