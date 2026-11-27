// Small, dependency-free helpers shared by the build scripts.
// Everything that reads user-provided folders goes through these checks.
import { realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** "WhatsApp Video 2026.mp4" -> "whatsapp-video-2026" (ASCII only, max 80 chars). */
export function slugify(name) {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A directory entry name we are willing to touch: no separators, no dot-files, no "..",
 * no control characters, sane length.
 */
export function isSafeEntryName(name) {
  if (typeof name !== "string" || name.length === 0 || name.length > 200) return false;
  if (name.startsWith(".")) return false;
  if (name.includes("/") || name.includes("\\") || name.includes("\0")) return false;
  if (/[\u0000-\u001f\u007f]/.test(name)) return false;
  return true;
}

/** True when `target` (after resolving symlinks) is inside `root`. Blocks symlink escapes. */
export function isInside(root, target) {
  try {
    const realRoot = realpathSync(root);
    const realTarget = realpathSync(target);
    const rel = path.relative(realRoot, realTarget);
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  } catch {
    return false;
  }
}

export function isRegularFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

export function isNewer(output, input) {
  try {
    return statSync(output).mtimeMs >= statSync(input).mtimeMs;
  } catch {
    return false;
  }
}

/** Detect real image type from magic bytes. SVG is deliberately not accepted (it can carry script). */
export function sniffImage(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  if (buf.length >= 12 && buf.toString("ascii", 4, 12) === "ftypavif") return "avif";
  return null;
}

export const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);
export const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/** A web-app liveUrl we are willing to frame: public https only, never our own origin. */
export function safeLiveUrl(input) {
  if (typeof input !== "string" || !input || input.length > 2048) return null;
  if (/[\u0000-\u0020\u007f]/.test(input)) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    if (!h.includes(".") || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local"))
      return null;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith("[")) return null;
    if (h === "services.tekraze.com") return null; // never frame our own origin
    return u.href;
  } catch {
    return null;
  }
}
