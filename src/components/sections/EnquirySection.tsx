import { site } from "@/content/site";
import { EnquiryForm } from "./EnquiryForm";

export function EnquirySection() {
  return (
    <section
      id="quote"
      aria-labelledby="quote-title"
      className="gutter grid-12 relative gap-y-10 py-[clamp(3rem,8vw,6rem)]"
    >
      <div className="col-span-12 lg:col-span-5">
        <p className="text-sm font-semibold text-tally">Your episode starts here</p>
        <h2 id="quote-title" className="display mt-2 text-[clamp(2.8rem,7vw,5.6rem)]">
          {site.primaryCta}
        </h2>
        <p className="measure mt-4 text-lg text-paper/85">
          Tell us what you need. Tekraze replies within 1 to 2 business days to clarify your goals,
          timeline and budget, then sends a custom quote.
        </p>
      </div>
      <div className="col-span-12 lg:col-span-7">
        <EnquiryForm />
      </div>
    </section>
  );
}
