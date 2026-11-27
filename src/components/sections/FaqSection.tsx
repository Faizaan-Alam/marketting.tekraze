import { faqs } from "@/content/site";

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="gutter py-[clamp(3rem,8vw,6rem)]">
      <div className="mx-auto max-w-4xl">
        <h2 id="faq-title" className="display text-[clamp(2.6rem,6vw,4.8rem)]">
          Questions, answered
        </h2>
        <div className="mt-8 border-t border-line">
          {faqs.map((f) => (
            <details key={f.id} id={`faq-${f.id}`} className="faq group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[clamp(1.05rem,1.8vw,1.3rem)] font-semibold [&::-webkit-details-marker]:hidden">
                {f.question}
                <span className="faq__icon relative h-5 w-5 shrink-0" aria-hidden="true" />
              </summary>
              <p className="measure pb-6 text-paper-dim">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
