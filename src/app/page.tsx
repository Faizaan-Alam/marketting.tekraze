import { categories, growthBundle, servicesByCategory, topTen } from "@/content/services";
import { mainSiteLinks } from "@/content/site";
import { team } from "@/content/team";
import { BootSequence } from "@/components/overlays/BootSequence";
import { ClientEffects } from "@/components/overlays/ClientEffects";
import { ServiceModalHost } from "@/components/overlays/ServiceModal";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Trailer } from "@/components/sections/Trailer";
import { Marquee } from "@/components/sections/Marquee";
import { ServiceRow } from "@/components/sections/ServiceRow";
import { TopTenRow } from "@/components/sections/TopTenRow";
import { BundleBillboard } from "@/components/sections/BundleBillboard";
import { WebAppsSection } from "@/components/sections/WebAppsSection";
import { ProcessQueue } from "@/components/sections/ProcessQueue";
import { CastSection } from "@/components/sections/CastSection";
import { WhySection } from "@/components/sections/WhySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { EnquirySection } from "@/components/sections/EnquirySection";
import { ContinueRow } from "@/components/sections/ContinueRow";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { MobileQuoteBar } from "@/components/sections/MobileQuoteBar";

/**
 * The whole browse page. Every piece of service text is rendered on the server, so it is in the
 * HTML for search engines and readable with JavaScript, WebGL or motion turned off.
 */
export default function HomePage() {
  return (
    <>
      <BootSequence />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Trailer />
        <Marquee words={categories.map((c) => c.shortTitle)} />

        <section id="services" aria-labelledby="services-title" className="relative pt-10 pb-6">
          <div className="gutter mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="services-title" className="display text-[clamp(2.4rem,6vw,4.4rem)]">
              Browse services
            </h2>
            <p className="measure text-paper-dim">
              Five categories, eleven services. Choose any title for the details, the timeline and a
              quote.
            </p>
          </div>
          <TopTenRow services={topTen} />
          {categories.map((category) => (
            <ServiceRow
              key={category.id}
              category={category}
              services={servicesByCategory(category.id)}
            />
          ))}
        </section>

        <BundleBillboard bundle={growthBundle} />
        <WebAppsSection />
        <Marquee words={["Enquire", "Chat", "Quote", "Build", "Deliver"]} reverse />
        <ProcessQueue />
        <CastSection members={team} />
        <WhySection />
        <FaqSection />
        <EnquirySection />
        <ContinueRow links={mainSiteLinks} />
      </main>
      <SiteFooter />
      <MobileQuoteBar />
      <ServiceModalHost />
      <ClientEffects />
    </>
  );
}
