import { reasons, timelines } from "@/content/site";

export function WhySection() {
  return (
    <section
      id="why"
      aria-labelledby="why-title"
      className="gutter grid-12 gap-y-12 py-[clamp(3rem,8vw,6rem)]"
    >
      <div className="col-span-12 lg:col-span-6">
        <h2 id="why-title" className="display text-[clamp(2.6rem,6vw,4.8rem)]">
          Why Tekraze
        </h2>
        <ul className="mt-8 divide-y divide-line border-y border-line" role="list">
          {reasons.map((r) => (
            <li key={r.title} className="py-6">
              <h3 className="text-xl font-semibold">{r.title}</h3>
              <p className="measure mt-1.5 text-paper-dim">{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div id="pricing" className="col-span-12 lg:col-span-5 lg:col-start-8">
        <h2 className="display text-[clamp(2.2rem,4.5vw,3.6rem)]">Pricing & timelines</h2>
        <p className="measure mt-4 text-paper-dim">
          There is no public price list and no hidden extras. Quotes follow a short discovery chat.
        </p>
        <table className="mt-6 w-full border-collapse text-left">
          <caption className="sr-only">Typical timelines</caption>
          <thead>
            <tr className="border-b border-line text-sm text-paper-faint">
              <th scope="col" className="py-2 pr-4 font-normal">
                Work
              </th>
              <th scope="col" className="py-2 font-normal">
                Typical time
              </th>
            </tr>
          </thead>
          <tbody>
            {timelines.map((t) => (
              <tr key={t.work} className="border-b border-line">
                <td className="py-4 pr-4">{t.work}</td>
                <td className="whitespace-nowrap py-4 font-semibold text-paper">{t.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
