import type { Bundle } from "@/content/schema";
import { site } from "@/content/site";
import { PosterArt } from "@/components/ui/PosterArt";
import { OpenServiceButton, QuoteButton } from "@/components/ui/ActionButtons";
import { videoFor } from "@/lib/media";
import { BundleVideo } from "./BundleVideo";

/** The Growth Bundle as a featured "Tekraze Original" billboard. */
export function BundleBillboard({ bundle }: { bundle: Bundle }) {
  const video = videoFor(bundle.slug);
  return (
    <section
      id="growth-bundle"
      aria-labelledby="bundle-title"
      className="gutter py-[clamp(3rem,8vw,6rem)]"
    >
      <div className="relative isolate overflow-hidden rounded-[1.25rem] border border-line bg-ink-2">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          {video?.preview ? (
            <BundleVideo src={video.preview} poster={video.poster} />
          ) : (
            <PosterArt
              slug={bundle.slug}
              category="bundle"
              hue={352}
              variant="billboard"
              className="h-full w-full opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#000_0%,rgb(0_0_0/0.86)_45%,rgb(0_0_0/0.74)_100%)]" />
        </div>
        <div className="grid-12 gap-y-8 p-[clamp(1.5rem,4vw,3.5rem)]">
          <div className="col-span-12 lg:col-span-7">
            <p className="flex items-center gap-3">
              <span className="rounded bg-tally px-2 py-0.5 text-sm font-bold text-white">
                {bundle.badge}
              </span>
              <span className="text-sm text-paper-dim">{bundle.audience}</span>
            </p>
            <h2 id="bundle-title" className="display mt-4 text-[clamp(3rem,7vw,6rem)]">
              {bundle.title}
            </h2>
            <p className="measure mt-4 text-lg text-paper/85">{bundle.logline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <QuoteButton service="Growth Bundle" className="btn btn-primary">
                {site.secondaryCta}
              </QuoteButton>
              <OpenServiceButton slug={bundle.slug} className="btn btn-ghost">
                More info
              </OpenServiceButton>
            </div>
          </div>
          <div className="col-span-12 grid gap-6 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            <div>
              <h3 className="font-semibold">What&rsquo;s included</h3>
              <ul className="mt-3 space-y-2 text-paper/85" role="list">
                {bundle.included.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className="tally-dot mt-[0.55em] shrink-0 text-[0.7rem]"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Optional add-ons</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-paper-dim" role="list">
                {bundle.addOns.map((item) => (
                  <li key={item}>+ {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
