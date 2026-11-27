import { categories, growthBundle, servicesByCategory } from "@/content/services";
import { site } from "@/content/site";
import { heroMedia } from "@/lib/media";
import { OpenServiceButton, QuoteButton, ScrollButton } from "@/components/ui/ActionButtons";
import { TrailerController, TrailerMedia, TrailerRail } from "./TrailerClient";

/** Splits a headline into word spans for the word-by-word reveal; reads as normal text. */
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className="reveal-word inline-block">
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/**
 * "Season 1 trailer": the hero billboard plus a pinned, scroll-scrubbed sequence where the five
 * categories arrive as episodes and the Growth Bundle lands as the finale. Without JS or with
 * reduced motion it renders as a plain, readable stack of the same content.
 */
export function Trailer() {
  const bands = [0, 0.14, 0.29, 0.44, 0.59, 0.74, 0.87, 1];
  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="trailer"
      data-bands={bands.join(",")}
    >
      <div className="trailer-stage">
        <TrailerMedia
          poster={heroMedia?.poster ?? null}
          loop={heroMedia?.loop ?? null}
          frameCount={heroMedia?.frameCount ?? 0}
          description={heroMedia?.description ?? null}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.86)_0%,rgb(0_0_0/0.55)_45%,rgb(0_0_0/0.1)_75%),linear-gradient(0deg,#000_0%,transparent_32%)]"
          aria-hidden="true"
        />

        {/* Billboard */}
        <div className="trailer-panel" data-panel="0" data-active="true">
          <div className="gutter flex h-full min-h-[100svh] flex-col justify-end pb-[clamp(6.5rem,16vh,10rem)] pt-28">
            <p className="flex items-center gap-2.5 text-sm font-semibold text-paper-dim">
              <span className="tally-dot animate-tally" aria-hidden="true" />
              Now streaming: Season 1
            </p>
            <h1
              id="hero-title"
              tabIndex={-1}
              className="display mt-4 max-w-[12ch] text-[clamp(3.6rem,10.5vw,9.5rem)] outline-none"
            >
              <Words text={site.headline} />
            </h1>
            <p className="mt-5 max-w-[46ch] text-[clamp(1.05rem,1.6vw,1.3rem)] text-paper/85">
              {site.tagline}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <QuoteButton className="btn btn-primary px-7 text-base">
                {site.primaryCta}
              </QuoteButton>
              <QuoteButton service="Growth Bundle" className="btn btn-ghost px-6 text-base">
                {site.secondaryCta}
              </QuoteButton>
              <span className="ml-1 hidden items-center gap-2 border-l-2 border-paper-faint py-1 pl-3 text-sm text-paper-dim sm:inline-flex">
                Custom quotes only, no hidden extras
              </span>
            </div>
          </div>
        </div>

        {/* Episodes */}
        {categories.map((c, i) => (
          <div
            key={c.id}
            className="trailer-panel is-episode"
            data-panel={i + 1}
            data-active="false"
            aria-labelledby={`ep-${c.id}`}
          >
            <div className="gutter flex h-full min-h-[100svh] flex-col justify-center py-28 md:max-w-[min(58%,52rem)]">
              <p className="font-display text-xl font-bold tracking-wide text-tally">
                Episode {c.episode} <span className="text-paper-faint">/ {categories.length}</span>
              </p>
              <h2 id={`ep-${c.id}`} className="display mt-3 text-[clamp(3rem,8.5vw,7.5rem)]">
                <Words text={c.title} />
              </h2>
              <p className="mt-4 max-w-[44ch] text-[clamp(1.05rem,1.5vw,1.25rem)] text-paper/85">
                {c.logline}
              </p>
              <ul className="mt-6 flex flex-wrap gap-2" role="list">
                {servicesByCategory(c.id).map((s) => (
                  <li
                    key={s.slug}
                    className="rounded-full border border-paper/25 bg-ink/40 px-3.5 py-1.5 text-sm backdrop-blur"
                  >
                    {s.title}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <ScrollButton target={`row-${c.id}`} className="btn btn-ghost">
                  Watch episode {c.episode}
                  <span className="sr-only">: browse {c.title} services</span>
                </ScrollButton>
              </div>
            </div>
          </div>
        ))}

        {/* Finale */}
        <div
          className="trailer-panel is-episode"
          data-panel={categories.length + 1}
          data-active="false"
          aria-labelledby="ep-finale"
        >
          <div className="gutter flex h-full min-h-[100svh] flex-col items-start justify-center py-28 md:max-w-[min(60%,54rem)]">
            <p className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-tally">
              Season finale{" "}
              <span className="rounded bg-tally px-2 py-0.5 text-sm text-white">
                {growthBundle.badge}
              </span>
            </p>
            <h2 id="ep-finale" className="display mt-3 text-[clamp(3rem,8.5vw,7.5rem)]">
              <Words text={growthBundle.title} />
            </h2>
            <p className="mt-4 max-w-[46ch] text-[clamp(1.05rem,1.5vw,1.25rem)] text-paper/85">
              {growthBundle.logline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <QuoteButton service="Growth Bundle" className="btn btn-primary">
                {site.secondaryCta}
              </QuoteButton>
              <OpenServiceButton slug={growthBundle.slug} className="btn btn-ghost">
                See what&rsquo;s included
              </OpenServiceButton>
            </div>
          </div>
        </div>

        <TrailerRail labels={["Trailer", ...categories.map((c) => c.title), "Finale"]} />
        <TrailerController bands={bands} />
      </div>
    </section>
  );
}
