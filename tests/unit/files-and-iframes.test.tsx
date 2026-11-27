import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  isInside,
  isSafeEntryName,
  safeLiveUrl,
  slugify,
  sniffImage,
} from "../../scripts/lib/safe-fs.mjs";
import { SandboxedIframe } from "@/components/sections/WebAppsSection";
import { TRAVERSAL } from "./payloads";

describe("file-name safety (video / webapps / members folders)", () => {
  it.each(TRAVERSAL)("never lets %s reach the file system as a path", (name) => {
    const hasSeparator = name.includes("/") || name.includes("\\");
    if (hasSeparator) expect(isSafeEntryName(name)).toBe(false);
    // whatever survives becomes a plain slug: no dots, slashes or percent signs
    expect(slugify(name)).toMatch(/^[a-z0-9-]*$/);
  });
  it("rejects dot-files, control characters and NUL", () => {
    expect(isSafeEntryName(".env")).toBe(false);
    expect(isSafeEntryName("..")).toBe(false);
    expect(isSafeEntryName("a\u0000b.mp4")).toBe(false);
    expect(isSafeEntryName("a\nb.mp4")).toBe(false);
    expect(isSafeEntryName("WhatsApp Video 2026.mp4")).toBe(true);
  });
  it("slugifies to a URL-safe id", () => {
    expect(slugify("WhatsApp Video 2026-11-26 at 7.44.03 PM.mp4")).toBe(
      "whatsapp-video-2026-11-26-at-7-44-03-pm",
    );
    expect(slugify("../../Étoile <script>.jpg")).toBe("etoile-script");
  });
  it("blocks symlinks that escape the folder", () => {
    const root = mkdtempSync(path.join(tmpdir(), "tz-"));
    const inner = path.join(root, "webapps");
    mkdirSync(inner);
    writeFileSync(path.join(inner, "ok.json"), "{}");
    symlinkSync("/etc", path.join(inner, "escape"));
    expect(isInside(inner, path.join(inner, "ok.json"))).toBe(true);
    expect(isInside(inner, path.join(inner, "escape", "hostname"))).toBe(false);
    expect(isInside(inner, path.join(inner, "..", "..", "etc"))).toBe(false);
  });
  it("detects real image types and refuses SVG / HTML disguised as images", () => {
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(sniffImage(Buffer.from('<svg onload="alert(1)">'))).toBeNull();
    expect(sniffImage(Buffer.from("<html><script>"))).toBeNull();
  });
});

describe("web-app live URLs", () => {
  it("only allows public https URLs, never our own origin", () => {
    expect(safeLiveUrl("https://app.example.com")).toBe("https://app.example.com/");
    for (const bad of [
      "javascript:alert(1)",
      "http://app.example.com",
      "https://localhost",
      "https://10.0.0.1",
      "https://services.tekraze.com/",
      "data:text/html,x",
      "https://u:p@x.com",
    ]) {
      expect(safeLiveUrl(bad)).toBeNull();
    }
  });
});

describe("sandboxed iframe", () => {
  it("is sandboxed with scripts only — no same-origin, top navigation, popups or forms", () => {
    const html = renderToStaticMarkup(
      <SandboxedIframe src="https://app.example.com" title="Preview" />,
    );
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).not.toMatch(/allow-same-origin|allow-top-navigation|allow-popups|allow-forms/);
    expect(html.toLowerCase()).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain('loading="lazy"');
  });
  it("renders nothing for unsafe URLs", () => {
    expect(renderToStaticMarkup(<SandboxedIframe src="javascript:alert(1)" title="x" />)).toBe("");
  });
});
