"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import type { VideoAsset } from "@/lib/media";
import { ModalFrame } from "@/components/overlays/ModalFrame";
import { ModalVideo } from "@/components/overlays/ServiceModal";
import { PlayIcon } from "./Icons";
import { detectCapabilities } from "@/lib/client/capabilities";
import { claimPreview } from "@/lib/client/preview";
import { playCue } from "@/lib/client/sound";

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A playable showcase video in a category row (configured in video-map.json → showcase).
 * Shows the video's own poster frame, plays a muted preview on hover/focus, and opens the full
 * video with controls in a title card (on touch, a tap opens the player directly).
 */
export function VideoShowcaseCard({ video, hue }: { video: VideoAsset; hue: number }) {
  const [preview, setPreview] = useState(false);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<HTMLElement | null>(null);
  const timer = useRef<number | null>(null);
  const titleId = useId();
  const stopSelf = useCallback(() => setPreview(false), []);
  const close = useCallback(() => setOpen(false), []);
  const duration = formatDuration(video.duration);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const start = () => {
    const caps = detectCapabilities();
    if (caps.reducedMotion || caps.saveData || !video.preview) return;
    claimPreview(stopSelf);
    setPreview(true);
  };
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setPreview(false);
  };

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height - 0.5) * 10).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2)}deg`);
  };

  return (
    <>
      <button
        type="button"
        data-row-item
        data-cursor="play"
        aria-haspopup="dialog"
        className="svc-card group relative block text-left"
        style={{ ["--hue" as string]: hue }}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(start, 250);
        }}
        onPointerMove={onMove}
        onPointerLeave={(e) => {
          e.currentTarget.style.setProperty("--rx", "0deg");
          e.currentTarget.style.setProperty("--ry", "0deg");
          stop();
        }}
        onFocus={start}
        onBlur={stop}
        onClick={(e) => {
          playCue("open");
          stop();
          setOrigin(e.currentTarget);
          setOpen(true);
        }}
      >
        <span className="svc-card__frame block">
          <span className="svc-card__poster relative block aspect-video overflow-hidden rounded-[0.6rem] bg-ink-3">
            {video.poster ? (
              // eslint-disable-next-line @next/next/no-img-element -- pre-optimised poster frame
              <img
                src={video.poster}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            {preview && video.preview ? (
              <video
                className="absolute inset-0 h-full w-full object-cover"
                src={video.preview}
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
              className="absolute left-2.5 top-2.5 rounded bg-tally px-2 py-0.5 text-[0.7rem] font-bold text-white"
              aria-hidden="true"
            >
              Showcase
            </span>
            <span
              className={`absolute inset-0 grid place-items-center transition-opacity duration-300 ${preview ? "opacity-0" : "opacity-100"}`}
              aria-hidden="true"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-paper/90 text-ink shadow-xl">
                <PlayIcon className="ml-0.5 h-6 w-6" />
              </span>
            </span>
            {duration ? (
              <span
                className="absolute bottom-2.5 right-2.5 rounded bg-ink/70 px-1.5 py-0.5 text-[0.7rem] tabular-nums text-paper/90"
                aria-hidden="true"
              >
                {duration}
              </span>
            ) : null}
          </span>
          <span className="block px-0.5 pt-3">
            <span className="block text-[1.05rem] font-semibold leading-snug">{video.title}</span>
            <span className="mt-1 block text-sm leading-snug text-paper-dim">
              Showcase video{duration ? ` · ${duration}` : ""}
            </span>
            <span className="svc-card__more mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink">
              <PlayIcon className="h-3 w-3" />
              Watch video
            </span>
          </span>
        </span>
      </button>
      <AnimatePresence>
        {open ? (
          <ModalFrame labelledBy={titleId} onClose={close} returnTo={origin}>
            <ModalVideo video={video} title={video.title} />
            <div className="px-6 pb-8 pt-5 sm:px-10">
              <h2 id={titleId} className="display text-[clamp(2rem,5vw,3.4rem)]">
                {video.title}
              </h2>
              {video.description ? (
                <p className="measure mt-2 text-paper-dim">{video.description}</p>
              ) : null}
            </div>
          </ModalFrame>
        ) : null}
      </AnimatePresence>
    </>
  );
}
