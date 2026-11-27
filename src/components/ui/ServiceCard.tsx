"use client";

import Image from "next/image";
import { m } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { Service } from "@/content/schema";
import { categoryById } from "@/content/services";
import { PosterArt } from "./PosterArt";
import { InfoIcon } from "./Icons";
import { posterOverride, videoFor } from "@/lib/media";
import { detectCapabilities } from "@/lib/client/capabilities";
import { openService } from "@/lib/client/store";
import { playCue } from "@/lib/client/sound";
import { claimPreview } from "@/lib/client/preview";

let collapseActive: (() => void) | null = null;

type Props = {
  service: Service;
  hue: number;
  /** Where the card lives (disambiguates shared-element ids when a service appears twice). */
  context?: string;
  /** Top-10 cards are portrait with a big numeral. */
  rank?: number;
};

export function ServiceCard({ service, hue, context = "row", rank }: Props) {
  const [preview, setPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [touch, setTouch] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const stopSelf = useCallback(() => setPreview(false), []);
  const lastPointer = useRef<string>("mouse");
  const video = videoFor(service.slug);
  const override = posterOverride(service.slug);
  const layoutId = `poster-${context}-${service.slug}`;
  const category = categoryById(service.category);
  const portrait = rank !== undefined;

  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  const startPreview = () => {
    const caps = detectCapabilities();
    if (caps.reducedMotion || caps.saveData) return;
    claimPreview(stopSelf);
    setPreview(true);
  };
  const stopPreview = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setPreview(false);
  };

  const onEnter = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(startPreview, 380);
  };

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
    stopPreview();
  };

  const onClick = (el: HTMLButtonElement) => {
    // Touch: first tap expands the card (preview + details), second tap opens the title card.
    if (lastPointer.current === "touch" && !expanded) {
      if (collapseActive) collapseActive();
      collapseActive = () => {
        setExpanded(false);
        setPreview(false);
      };
      setExpanded(true);
      startPreview();
      playCue("tick");
      return;
    }
    playCue("open");
    stopPreview();
    openService(service.slug, el, layoutId);
  };

  return (
    <button
      type="button"
      data-row-item
      data-cursor="view"
      data-expanded={expanded}
      aria-haspopup="dialog"
      aria-expanded={touch ? expanded : undefined}
      className={`svc-card group relative block text-left ${portrait ? "svc-card--rank" : ""}`}
      style={{ ["--hue" as string]: hue }}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
        if (e.pointerType === "touch") setTouch(true);
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && onEnter()}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onFocus={() => {
        onEnter();
        playCue("tick");
      }}
      onBlur={() => {
        stopPreview();
        setExpanded(false);
      }}
      onClick={(e) => onClick(e.currentTarget)}
    >
      {portrait ? (
        <span className="svc-card__rank display" aria-hidden="true">
          {rank}
        </span>
      ) : null}
      <span className="svc-card__frame block">
        <m.span
          layoutId={layoutId}
          className={`svc-card__poster relative block overflow-hidden rounded-[0.6rem] bg-ink-3 ${portrait ? "aspect-[2/3]" : "aspect-video"}`}
          data-gl-poster={override ? undefined : "true"}
        >
          {override ? (
            <Image
              src={override}
              alt=""
              fill
              sizes="(max-width: 640px) 70vw, 340px"
              className="object-cover"
            />
          ) : (
            <PosterArt
              slug={service.slug}
              category={service.category}
              hue={hue}
              variant={context}
              className="svc-card__art absolute inset-0 h-full w-full"
            />
          )}
          {preview && video?.preview ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={video.preview}
              poster={video.poster ?? undefined}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
            />
          ) : null}
          <span className="svc-card__sheen absolute inset-0" aria-hidden="true" />
          <span
            className="absolute left-2.5 top-2.5 rounded bg-ink/60 px-2 py-0.5 text-[0.7rem] font-semibold text-paper/90 backdrop-blur"
            aria-hidden="true"
          >
            {category.shortTitle}
          </span>
          {video ? (
            <span
              className="absolute bottom-2.5 right-2.5 rounded-full bg-ink/60 px-2 py-0.5 text-[0.7rem] text-paper/80 backdrop-blur"
              aria-hidden="true"
            >
              Preview
            </span>
          ) : null}
        </m.span>
        <span className="svc-card__body block px-0.5 pt-3">
          <span className="block text-[1.05rem] font-semibold leading-snug">{service.title}</span>
          <span className="mt-1 block text-sm leading-snug text-paper-dim">{service.summary}</span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            {service.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-line px-2 py-0.5 text-[0.7rem] text-paper-faint"
              >
                {t}
              </span>
            ))}
          </span>
          <span className="svc-card__more mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink">
            <InfoIcon className="h-3.5 w-3.5" />
            {expanded ? "Tap again for details" : "More info"}
          </span>
        </span>
      </span>
    </button>
  );
}
