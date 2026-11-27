import type { ExternalLink as Link } from "@/content/schema";
import { ExternalIcon } from "@/components/ui/Icons";
import { RowShell } from "./ServiceRow";

const HUES: Record<string, number> = { Guides: 36, "Resume Analyzer": 192, "Crypto Tools": 232 };

/** "Continue exploring": the main Tekraze site sections (external). */
export function ContinueRow({ links }: { links: ReadonlyArray<Link> }) {
  const items = links.filter((l) => l.label !== "Services");
  return (
    <div className="pb-[clamp(2rem,6vw,4rem)]">
      <RowShell
        id="continue"
        title="Continue exploring on tekraze.com"
        label="Tekraze main site sections"
      >
        {items.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              data-row-item
              data-cursor="view"
              className="svc-card group block"
              style={{ ["--hue" as string]: HUES[l.label] ?? 352 }}
            >
              <span className="svc-card__frame block">
                <span
                  className="svc-card__poster relative flex aspect-video flex-col justify-end overflow-hidden rounded-[0.6rem] p-4"
                  style={{
                    background: `radial-gradient(120% 120% at 80% 10%, hsl(${HUES[l.label] ?? 352} 70% 40% / 0.6), #0d0b0f 65%)`,
                  }}
                >
                  <span className="display text-[2.4rem]">{l.label}</span>
                </span>
                <span className="mt-3 flex items-start justify-between gap-3 px-0.5">
                  <span className="text-sm text-paper-dim">{l.description}</span>
                  <ExternalIcon className="mt-1 h-4 w-4 shrink-0 text-paper-faint" />
                </span>
              </span>
              <span className="sr-only"> (opens tekraze.com in a new tab)</span>
            </a>
          </li>
        ))}
      </RowShell>
    </div>
  );
}
