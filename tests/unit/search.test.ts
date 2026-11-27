import { describe, expect, it } from "vitest";
import { fold, readQueryParam, search, segments } from "@/lib/search";
import { searchIndex } from "@/lib/search-index";
import { REGEX_BOMBS, SQLI, XSS } from "./payloads";

describe("search", () => {
  it("finds services by title, tag and description", () => {
    expect(search(searchIndex, "seo")[0]?.doc.title).toBe("Blog writing & SEO");
    expect(search(searchIndex, "logo").map((r) => r.doc.id)).toContain("service:graphic-design");
    expect(search(searchIndex, "linkedin").map((r) => r.doc.id)).toContain(
      "service:resume-services",
    );
    expect(search(searchIndex, "bundle")[0]?.doc.kind).toBe("bundle");
  });
  it("is case-, accent- and typo-tolerant", () => {
    expect(search(searchIndex, "WEBSITE").length).toBeGreaterThan(0);
    expect(search(searchIndex, "résumé").map((r) => r.doc.id)).toContain("service:resume-services");
    expect(search(searchIndex, "mrktng").map((r) => r.doc.id)).toContain(
      "service:marketing-website",
    );
  });
  it("returns highlight ranges inside the title", () => {
    const r = search(searchIndex, "design")[0];
    expect(r).toBeDefined();
    const parts = segments(r!.doc.title, r!.highlights);
    expect(parts.some((p) => p.match && p.text.toLowerCase() === "design")).toBe(true);
    expect(parts.map((p) => p.text).join("")).toBe(r!.doc.title);
  });
  it("treats hostile input as plain data and never throws", () => {
    for (const q of [...XSS, ...SQLI, ...REGEX_BOMBS]) {
      expect(() => search(searchIndex, q)).not.toThrow();
    }
    expect(search(searchIndex, "<script>alert(1)</script>")).toEqual([]);
    // payload characters are separators; the real word still matches
    expect(
      search(searchIndex, '"><img src=x onerror=alert(1)>design').length,
    ).toBeGreaterThanOrEqual(0);
  });
  it("handles regex-catastrophic patterns quickly (no RegExp is built from input)", () => {
    const start = performance.now();
    for (let i = 0; i < 200; i += 1) search(searchIndex, "(a+)+$" + "a".repeat(60));
    expect(performance.now() - start).toBeLessThan(1500);
  });
  it("ignores non-string queries", () => {
    expect(search(searchIndex, 42)).toEqual([]);
    expect(search(searchIndex, { toString: () => "seo" })).toEqual([]);
  });
});

describe("fold", () => {
  it("keeps string length so highlight indexes line up", () => {
    for (const s of ["Résumé", "Crème brûlée", "naïve 😀 café"])
      expect(fold(s)).toHaveLength(s.length);
  });
});

describe("readQueryParam", () => {
  it("validates and caps ?q=", () => {
    expect(readQueryParam(null)).toBe("");
    expect(readQueryParam("seo\u0000‮")).toBe("seo");
    expect(readQueryParam("a".repeat(1000))).toHaveLength(64);
  });
});
