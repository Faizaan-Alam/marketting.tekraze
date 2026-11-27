"use client";

import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { categoryById, growthBundle, services, servicesByCategory } from "@/content/services";
import { PosterArt } from "@/components/ui/PosterArt";
import { posterOverride, videoFor, type VideoAsset } from "@/lib/media";
import { openService, requestQuote, setUi, useUi } from "@/lib/client/store";
import { ModalFrame } from "./ModalFrame";

const KNOWN = new Set([...services.map((s) => s.slug), growthBundle.slug]);

function syncServiceParam(slug: string | null): void {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("service", slug);
  else url.searchParams.delete("service");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

function ModalVideo({ video, title }: { video: VideoAsset; title: string }) {
  return (
    <figure className="relative">
      <video
        className="aspect-video w-full bg-black object-contain"
        src={video.src}
        poster={video.poster ?? undefined}
        controls
        muted
        playsInline
        preload="metadata"
        aria-label={`${video.title} (video for ${title})`}
      >
        {video.captions ? (
          <track kind="captions" src={video.captions} srcLang="en" label="English" default />
        ) : null}
      </video>
      {video.description ? (
        <details className="border-b border-line px-6 py-3 text-sm text-paper-dim sm:px-10">
          <summary className="cursor-pointer text-paper">Video description</summary>
          <p className="mt-2">{video.description}</p>
        </details>
      ) : null}
    </figure>
  );
}

export function ServiceModalHost() {
  const slug = useUi((s) => s.modal);
  const origin = useUi((s) => s.modalOrigin);
  const layoutId = useUi((s) => s.modalLayoutId);
  const bootDone = useUi((s) => s.bootDone);

  const close = useCallback(() => setUi({ modal: null, modalLayoutId: null }), []);

  // Deep link: ?service=<slug> (validated against the known slugs) once the intro is done.
  useEffect(() => {
    if (!bootDone) return;
    const wanted = new URLSearchParams(window.location.search).get("service");
    if (wanted && KNOWN.has(wanted)) openService(wanted, null);
  }, [bootDone]);

  // Mirror the open title card in ?service= (only after one has been opened, so the deep link
  // above is not erased before it is read).
  const opened = useRef(false);
  useEffect(() => {
    if (slug !== null && KNOWN.has(slug)) {
      opened.current = true;
      syncServiceParam(slug);
    } else if (slug === null && opened.current) {
      syncServiceParam(null);
    }
  }, [slug]);

  const service = slug ? services.find((s) => s.slug === slug) : undefined;
  const isBundle = slug === growthBundle.slug;
  const titleId = "service-modal-title";

  return (
    <AnimatePresence>
      {service || isBundle ? (
        <ModalFrame key={slug} labelledBy={titleId} onClose={close} returnTo={origin}>
          {service ? (
            <ServiceDetail slug={service.slug} layoutId={layoutId} titleId={titleId} />
          ) : (
            <BundleDetail titleId={titleId} />
          )}
        </ModalFrame>
      ) : null}
    </AnimatePresence>
  );
}

function ServiceDetail({
  slug,
  layoutId,
  titleId,
}: {
  slug: string;
  layoutId: string | null;
  titleId: string;
}) {
  const service = services.find((s) => s.slug === slug);
  if (!service) return null;
  const category = categoryById(service.category);
  const video = videoFor(service.slug);
  const override = posterOverride(service.slug);
  const more = servicesByCategory(service.category).filter((s) => s.slug !== service.slug);

  return (
    <article>
      {video ? (
        <ModalVideo video={video} title={service.title} />
      ) : (
        <m.div
          layoutId={layoutId ?? undefined}
          className="relative aspect-[21/9] w-full overflow-hidden"
        >
          {override ? (
            <Image
              src={override}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 900px"
              className="object-cover"
            />
          ) : (
            <PosterArt
              slug={service.slug}
              category={service.category}
              hue={category.hue}
              variant="modal"
              className="absolute inset-0 h-full w-full"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-transparent to-transparent" />
        </m.div>
      )}
      <div className="grid-12 gap-y-8 px-6 pb-10 pt-6 sm:px-10">
        <header className="col-span-12">
          <p className="text-sm font-semibold text-tally">
            Episode {category.episode}: {category.title}
          </p>
          <h2 id={titleId} className="display mt-2 text-[clamp(2.6rem,6vw,4.5rem)]">
            {service.title}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Tags">
            {service.tags.map((t) => (
              <li
                key={t}
                className="rounded-full border border-line px-2.5 py-0.5 text-xs text-paper-dim"
              >
                {t}
              </li>
            ))}
          </ul>
        </header>
        <div className="col-span-12 md:col-span-7">
          <p className="text-lg text-paper/90">{service.description}</p>
          {service.options ? (
            <div className="mt-6">
              <h3 className="font-semibold">Three options</h3>
              <ol className="mt-3 grid gap-3" role="list">
                {service.options.map((o, i) => (
                  <li key={o.title} className="rounded-xl border border-line bg-ink-3/60 p-4">
                    <p className="font-semibold">
                      <span className="text-tally">{i + 1}.</span> {o.title}
                    </p>
                    <p className="mt-1 text-sm text-paper-dim">{o.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {service.disclaimer ? (
            <p className="mt-6 rounded-lg border-l-2 border-tally bg-ink-3/60 px-4 py-3 text-sm text-paper">
              {service.disclaimer}
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary mt-8"
            data-autofocus
            onClick={() => requestQuote(service.title)}
          >
            Get a quote for this service
          </button>
        </div>
        <aside className="col-span-12 space-y-6 md:col-span-5" aria-label="Details">
          <div>
            <h3 className="font-semibold">What&rsquo;s included</h3>
            <ul className="mt-2 space-y-1.5 text-paper-dim" role="list">
              {service.included.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className="tally-dot mt-[0.6em] shrink-0 text-[0.6rem]"
                    aria-hidden="true"
                  />
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Typical timeline</h3>
            <p className="mt-2 text-paper-dim">{service.timeline}</p>
          </div>
          <div>
            <h3 className="font-semibold">Price</h3>
            <p className="mt-2 text-paper-dim">
              Custom quote after a short discovery chat. No hidden extras.
            </p>
          </div>
        </aside>
        {more.length > 0 ? (
          <nav
            className="col-span-12 border-t border-line pt-6"
            aria-label={`More in ${category.title}`}
          >
            <h3 className="text-sm text-paper-faint">Next episode in {category.title}</h3>
            <ul className="mt-3 flex flex-wrap gap-2" role="list">
              {more.map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    className="rounded-full border border-line px-4 py-2 text-sm hover:border-paper"
                    onClick={() => openService(s.slug, null)}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </article>
  );
}

function BundleDetail({ titleId }: { titleId: string }) {
  const video = videoFor(growthBundle.slug);
  return (
    <article>
      {video ? (
        <ModalVideo video={video} title={growthBundle.title} />
      ) : (
        <div className="relative aspect-[21/9] w-full overflow-hidden">
          <PosterArt
            slug={growthBundle.slug}
            category="bundle"
            hue={352}
            variant="modal"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      )}
      <div className="grid-12 gap-y-8 px-6 pb-10 pt-6 sm:px-10">
        <header className="col-span-12">
          <p className="flex items-center gap-2 text-sm">
            <span className="rounded bg-tally px-2 py-0.5 font-bold text-white">
              {growthBundle.badge}
            </span>
            <span className="text-paper-dim">Season finale</span>
          </p>
          <h2 id={titleId} className="display mt-2 text-[clamp(2.6rem,6vw,4.5rem)]">
            {growthBundle.title}
          </h2>
          <p className="mt-3 text-lg text-paper/90">{growthBundle.audience}</p>
        </header>
        <div className="col-span-12 md:col-span-7">
          <h3 className="font-semibold">Included</h3>
          <ul className="mt-3 space-y-2 text-paper/90" role="list">
            {growthBundle.included.map((i) => (
              <li key={i} className="flex gap-2.5">
                <span className="tally-dot mt-[0.6em] shrink-0 text-[0.6rem]" aria-hidden="true" />
                {i}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-primary mt-8"
            data-autofocus
            onClick={() => requestQuote("Growth Bundle")}
          >
            Get a quote for the bundle
          </button>
        </div>
        <aside className="col-span-12 md:col-span-5" aria-label="Optional add-ons">
          <h3 className="font-semibold">Optional add-ons</h3>
          <ul className="mt-3 space-y-1.5 text-paper-dim" role="list">
            {growthBundle.addOns.map((a) => (
              <li key={a}>+ {a}</li>
            ))}
          </ul>
          <h3 className="mt-6 font-semibold">Price</h3>
          <p className="mt-2 text-paper-dim">
            Custom quote after a short discovery chat. No hidden extras.
          </p>
        </aside>
      </div>
    </article>
  );
}
