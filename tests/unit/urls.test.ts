import { describe, expect, it } from "vitest";
import { isAllowedHostUrl, isSafeAnchor, isSafeHttpsUrl, safeOrigin } from "@/lib/urls";

describe("isSafeHttpsUrl", () => {
  it("accepts public https URLs", () => {
    expect(isSafeHttpsUrl("https://tekraze.com/contact-us/")).toBe(true);
    expect(isSafeHttpsUrl("https://t.me/s/tekraze")).toBe(true);
  });
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    " https://tekraze.com",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "http://tekraze.com",
    "//evil.com",
    "/relative",
    "https://user:pass@tekraze.com",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://169.254.169.254/latest/meta-data",
    "https://intranet",
    "https://printer.local/",
    "",
  ])("rejects %s", (url) => {
    expect(isSafeHttpsUrl(url)).toBe(false);
  });
});

describe("host allow-list", () => {
  it("matches exact hosts and subdomains only", () => {
    expect(isAllowedHostUrl("https://www.youtube.com/@x", ["youtube.com"])).toBe(true);
    expect(isAllowedHostUrl("https://youtube.com.evil.com/", ["youtube.com"])).toBe(false);
    expect(isAllowedHostUrl("https://evilyoutube.com/", ["youtube.com"])).toBe(false);
  });
  it("returns origins for CSP", () => {
    expect(safeOrigin("https://app.example.com/path?q=1")).toBe("https://app.example.com");
    expect(safeOrigin("javascript:alert(1)")).toBeNull();
  });
  it("only allows simple in-page anchors", () => {
    expect(isSafeAnchor("#faq")).toBe(true);
    expect(isSafeAnchor("#a b")).toBe(false);
    expect(isSafeAnchor("javascript:alert(1)")).toBe(false);
  });
});
