import type { Service } from "@/content/schema";
import { categoryById } from "@/content/services";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { RowShell } from "./ServiceRow";

export function TopTenRow({ services }: { services: ReadonlyArray<Service> }) {
  return (
    <RowShell
      id="top-10"
      title="Top 10 at Tekraze"
      description="Ranked by the Tekraze team as the best places to start."
      label="Top 10 services"
    >
      {services.map((s, i) => (
        <li key={s.slug} className="[transform-style:preserve-3d]">
          <ServiceCard service={s} hue={categoryById(s.category).hue} context="top" rank={i + 1} />
        </li>
      ))}
    </RowShell>
  );
}
