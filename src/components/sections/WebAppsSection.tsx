"use client";

import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ExternalIcon } from "@/components/ui/Icons";
import { ModalFrame } from "@/components/overlays/ModalFrame";
import { webApps, type WebApp } from "@/lib/media";
import { isSafeHttpsUrl } from "@/lib/urls";
import { requestQuote } from "@/lib/client/store";
import { RowShell } from "./ServiceRow";

/**
 * A laptop frame in CSS 3D that tilts toward the cursor. Children render on its screen.
 * Pure CSS/DOM so it works without WebGL; the tilt is skipped for touch and reduced motion.
 */
export function DeviceFrame({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !document.documentElement.classList.contains("motion-ok"))
      return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--dx", `${(x * 16).toFixed(2)}deg`);
    el.style.setProperty("--dy", `${(-y * 10 + 6).toFixed(2)}deg`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--dx", "-8deg");
    ref.current?.style.setProperty("--dy", "6deg");
  };
  return (
    <div className="device-stage" onPointerMove={onMove} onPointerLeave={reset}>
      <div ref={ref} className="device" role="group" aria-label={label}>
        <div className="device__lid">
          <div className="device__screen">{children}</div>
        </div>
        <div className="device__base" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Untrusted preview: only ever inside a sandboxed iframe, loaded on request.
 * sandbox="allow-scripts" WITHOUT allow-same-origin gives the page an opaque origin: it cannot
 * read our cookies/storage, navigate the top window, open popups or submit forms.
 */
function SandboxedPreview({ app }: { app: WebApp }) {
  const [load, setLoad] = useState(false);
  if (!app.liveUrl || !isSafeHttpsUrl(app.liveUrl)) {
    return <Thumb app={app} />;
  }
  if (!load) {
    return (
      <div className="relative h-full w-full">
        <Thumb app={app} />
        <div className="absolute inset-0 grid place-items-center bg-ink/50">
          <button type="button" className="btn btn-ghost" onClick={() => setLoad(true)}>
            Load live preview
          </button>
        </div>
      </div>
    );
  }
  return <SandboxedIframe src={app.liveUrl} title={`Live preview of ${app.title}`} />;
}

/** The only iframe in the project. Never add allow-same-origin, allow-top-navigation or allow-popups. */
export function SandboxedIframe({ src, title }: { src: string; title: string }) {
  if (!isSafeHttpsUrl(src)) return null;
  return (
    <iframe
      src={src}
      title={title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      loading="lazy"
      allow=""
      className="h-full w-full border-0 bg-white"
      {...{ credentialless: "" }}
    />
  );
}

function Thumb({ app }: { app: WebApp }) {
  return app.thumbnail ? (
    <Image
      src={app.thumbnail}
      alt={`Screenshot of ${app.title}`}
      fill
      sizes="(max-width: 900px) 90vw, 720px"
      className="object-cover object-top"
    />
  ) : (
    <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgb(242_36_58/0.3),transparent_60%),#0d0b0f]">
      <span className="display text-4xl text-paper/80">{app.title}</span>
    </div>
  );
}

export function WebAppsSection() {
  const [open, setOpen] = useState<WebApp | null>(null);
  const [origin, setOrigin] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setOpen(null), []);

  return (
    <section id="web-apps" aria-labelledby="web-apps-title" className="py-[clamp(2rem,6vw,4rem)]">
      <div className="gutter grid-12 items-center gap-y-10">
        <div className="col-span-12 lg:col-span-5">
          <p className="text-sm font-semibold text-tally">Our Originals</p>
          <h2 id="web-apps-title" className="display mt-2 text-[clamp(2.6rem,6vw,4.8rem)]">
            Web apps we&rsquo;ve built
          </h2>
          <p className="measure mt-4 text-paper-dim">
            Websites and web apps from the Tekraze team. Open one for a live preview: it runs in a
            locked-down sandbox, separate from this site.
          </p>
          {webApps.length === 0 ? (
            <div className="mt-6">
              <p className="text-paper">New originals are in production.</p>
              <button
                type="button"
                className="btn btn-primary mt-5"
                onClick={() => requestQuote("Marketing website")}
              >
                Get a quote for your website
              </button>
            </div>
          ) : null}
        </div>
        <div className="col-span-12 lg:col-span-7">
          <DeviceFrame
            label={
              webApps[0] ? `${webApps[0].title} on a laptop` : "Laptop showing an upcoming project"
            }
          >
            {webApps[0] ? (
              <Thumb app={webApps[0]} />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_70%_30%,rgb(242_36_58/0.35),transparent_60%),#0d0b0f] p-6 text-center">
                <div>
                  <span className="tally-dot animate-tally text-2xl" aria-hidden="true" />
                  <p className="display mt-3 text-[clamp(1.6rem,3.5vw,2.8rem)]">
                    Coming soon to this screen
                  </p>
                </div>
              </div>
            )}
          </DeviceFrame>
        </div>
      </div>

      {webApps.length > 0 ? (
        <div className="mt-6">
          <RowShell id="row-webapps" title="Browse web apps" label="Web apps">
            {webApps.map((app) => (
              <li key={app.slug}>
                <button
                  type="button"
                  data-row-item
                  data-cursor="view"
                  aria-haspopup="dialog"
                  className="svc-card group block text-left"
                  style={{ ["--hue" as string]: 352 }}
                  onClick={(e) => {
                    setOrigin(e.currentTarget);
                    setOpen(app);
                  }}
                >
                  <span className="svc-card__frame block">
                    <span className="svc-card__poster relative block aspect-video overflow-hidden rounded-[0.6rem] bg-ink-3">
                      <Thumb app={app} />
                    </span>
                    <span className="block px-0.5 pt-3">
                      <span className="block font-semibold">{app.title}</span>
                      <span className="mt-1 line-clamp-2 block text-sm text-paper-dim">
                        {app.description}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </RowShell>
        </div>
      ) : null}

      <AnimatePresence>
        {open ? (
          <ModalFrame
            key={open.slug}
            labelledBy="webapp-modal-title"
            onClose={close}
            returnTo={origin}
            wide
          >
            <div className="px-4 pb-8 pt-14 sm:px-10">
              <DeviceFrame label={`${open.title} preview`}>
                <SandboxedPreview app={open} />
              </DeviceFrame>
              <h2 id="webapp-modal-title" className="display mt-8 text-[clamp(2.4rem,5vw,4rem)]">
                {open.title}
              </h2>
              <p className="measure mt-3 text-paper/90">{open.description}</p>
              {open.tags.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2" role="list">
                  {open.tags.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-line px-2.5 py-0.5 text-xs text-paper-dim"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                {open.liveUrl ? (
                  <a
                    href={open.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    data-autofocus
                  >
                    Visit live <ExternalIcon />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => requestQuote("WordPress & React builds")}
                >
                  Build something like this
                </button>
              </div>
            </div>
          </ModalFrame>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
