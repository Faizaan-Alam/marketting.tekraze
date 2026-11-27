import { describe, expect, it } from "vitest";
import videoMap from "@/content/video-map.json";
import { categories, growthBundle, services, topTen } from "@/content/services";
import { faqs, footerLinks, mainSiteLinks, processSteps, socialLinks } from "@/content/site";
import { team } from "@/content/team";
import { jsonLdGraph } from "@/lib/structured-data";
import { isAllowedHostUrl } from "@/lib/urls";

const ALLOWED_HOSTS = [
  "tekraze.com",
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "linkedin.com",
  "pinterest.com",
  "youtube.com",
  "t.me",
  "medium.com",
];

describe("content matches the brief", () => {
  it("has the five categories in order with 11 services", () => {
    expect(categories.map((c) => c.title)).toEqual([
      "Brand & Design",
      "Content & SEO",
      "Websites & Apps",
      "Video & Social",
      "Research & Analysis",
    ]);
    expect(services).toHaveLength(11);
    expect(topTen).toHaveLength(10);
  });
  it("shows the crypto disclaimer exactly", () => {
    expect(services.find((s) => s.slug === "crypto-analysis")?.disclaimer).toBe(
      "Informational only, not financial advice.",
    );
  });
  it("has the three resume options", () => {
    expect(
      services.find((s) => s.slug === "resume-services")?.options?.map((o) => o.title),
    ).toEqual(["Analysis", "Optimisation", "Creation"]);
  });
  it("has the Growth Bundle contents", () => {
    expect(growthBundle.included).toHaveLength(5);
    expect(growthBundle.addOns).toHaveLength(5);
  });
  it("has 5 process steps and 6 FAQs", () => {
    expect(processSteps.map((s) => s.title)).toEqual([
      "Enquire",
      "Chat",
      "Quote",
      "Build",
      "Deliver",
    ]);
    expect(faqs).toHaveLength(6);
  });
  it("contains no prices, statistics or testimonials", () => {
    const text = JSON.stringify({ services, growthBundle, faqs, processSteps });
    expect(text).not.toMatch(/[$€£₹]\s?\d|\b\d+\s?%|\bper hour\b|testimonial|\bclients?\b/i);
  });
  it("does not invent team roles or bios", () => {
    expect(team.map((m) => m.name)).toEqual(["Kamran Alam", "Balwinder Singh", "Faizaan Alam"]);
    for (const m of team) {
      expect(m.role).toBe("");
      expect(m.bio).toBe("");
      expect(m.socials).toEqual([]);
    }
  });
});

describe("links", () => {
  it("every external link is https on an allow-listed host", () => {
    for (const l of [...mainSiteLinks, ...footerLinks])
      expect(isAllowedHostUrl(l.href, ALLOWED_HOSTS)).toBe(true);
    for (const s of socialLinks) expect(isAllowedHostUrl(s.url, ALLOWED_HOSTS)).toBe(true);
  });
});

describe("video map", () => {
  it("only assigns videos to real services or the bundle", () => {
    const slugs = new Set([...services.map((s) => s.slug), growthBundle.slug]);
    for (const key of Object.keys(videoMap.assignments)) expect(slugs.has(key)).toBe(true);
  });
});

describe("JSON-LD", () => {
  it("includes Organization, Service and FAQPage nodes and survives </script> escaping", () => {
    const graph = jsonLdGraph()["@graph"];
    const types = graph.map((n) => (n as { "@type": string })["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("FAQPage");
    expect(types.filter((t) => t === "Service")).toHaveLength(12);
    const serialised = JSON.stringify(jsonLdGraph()).replace(/</g, "\\u003c");
    expect(serialised).not.toContain("</");
  });
});
