import { categories, categoryById, growthBundle, services } from "@/content/services";
import { faqs } from "@/content/site";
import { displayRole, team } from "@/content/team";
import { webApps } from "./media";
import type { SearchDoc } from "./search";

/** The static search index, built from the content files at build time. */
export const searchIndex: ReadonlyArray<SearchDoc> = [
  ...services.map<SearchDoc>((s) => ({
    id: `service:${s.slug}`,
    kind: "service",
    title: s.title,
    body: [
      s.summary,
      s.description,
      s.tags.join(" "),
      s.included.join(" "),
      ...(s.options ?? []).map((o) => `${o.title} ${o.description}`),
    ].join(" "),
    meta: categoryById(s.category).title,
    target: { type: "service", slug: s.slug },
  })),
  {
    id: `bundle:${growthBundle.slug}`,
    kind: "bundle",
    title: growthBundle.title,
    body: [
      growthBundle.logline,
      growthBundle.audience,
      ...growthBundle.included,
      ...growthBundle.addOns,
    ].join(" "),
    meta: growthBundle.badge,
    target: { type: "service", slug: growthBundle.slug },
  },
  ...categories.map<SearchDoc>((c) => ({
    id: `category:${c.id}`,
    kind: "category",
    title: c.title,
    body: c.logline,
    meta: `Episode ${c.episode}`,
    target: { type: "anchor", id: `row-${c.id}` },
  })),
  ...webApps.map<SearchDoc>((w) => ({
    id: `webapp:${w.slug}`,
    kind: "webapp",
    title: w.title,
    body: `${w.description} ${w.tags.join(" ")}`,
    meta: "Web app",
    target: { type: "anchor", id: "web-apps" },
  })),
  ...team.map<SearchDoc>((m) => ({
    id: `member:${m.slug}`,
    kind: "member",
    title: m.name,
    body: `${displayRole(m)} ${m.bio}`,
    meta: "Team",
    target: { type: "anchor", id: "team" },
  })),
  ...faqs.map<SearchDoc>((f) => ({
    id: `faq:${f.id}`,
    kind: "faq",
    title: f.question,
    body: f.answer,
    meta: "FAQ",
    target: { type: "anchor", id: `faq-${f.id}` },
  })),
];
