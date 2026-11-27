#!/usr/bin/env node
// Scans the folders you fill and writes typed manifests to src/generated/:
//   video-manifest.json    public/video/ (+ optimised files in public/video/web/)
//   assets-manifest.json   public/members/ photos and public/posters/ poster overrides
//   webapps-manifest.json  webapps/<project>/meta.json (thumbnails copied to public/generated/webapps/)
// Runs automatically before `dev`, `build` and `typecheck`. Nothing here ever executes code from
// the scanned folders; file names are validated, symlinks that escape the folder are ignored, and
// thumbnails are checked by magic bytes (SVG is refused because it can contain script).
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  IMAGE_EXT,
  ROOT,
  SAFE_SLUG,
  VIDEO_EXT,
  isInside,
  isRegularFile,
  isSafeEntryName,
  safeLiveUrl,
  slugify,
  sniffImage,
} from "./lib/safe-fs.mjs";

const PUBLIC = path.join(ROOT, "public");
const VIDEO_DIR = path.join(PUBLIC, "video");
const WEB_DIR = path.join(VIDEO_DIR, "web");
const MEMBERS_DIR = path.join(PUBLIC, "members");
const POSTERS_DIR = path.join(PUBLIC, "posters");
const WEBAPPS_DIR = path.join(ROOT, "webapps");
const GEN_DIR = path.join(ROOT, "src", "generated");
const GEN_PUBLIC = path.join(PUBLIC, "generated", "webapps");

const warnings = [];
const warn = (msg) => warnings.push(msg);

function listFiles(dir, extSet) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && isSafeEntryName(e.name))
    .filter((e) => extSet.has(path.extname(e.name).toLowerCase()))
    .filter((e) => isInside(dir, path.join(dir, e.name)))
    .map((e) => e.name)
    .sort();
}

const urlFor = (...segments) => "/" + segments.map((s) => encodeURIComponent(s)).join("/");

// ── video map ───────────────────────────────────────────────────────
const VideoMap = z.object({
  _help: z.string().optional(),
  hero: z
    .object({
      video: z.string(),
      loopStart: z.number().min(0),
      loopSeconds: z.number().min(1).max(30),
      scrubStart: z.number().min(0),
      scrubEnd: z.number().min(1),
      scrubFrames: z.number().int().min(8).max(240),
    })
    .optional(),
  assignments: z.record(z.string().regex(SAFE_SLUG), z.string()).default({}),
  showcase: z
    .partialRecord(
      z.enum(["brand", "content", "web", "video", "research"]),
      z.array(z.string()).max(12),
    )
    .default({}),
  details: z
    .record(
      z.string(),
      z.object({
        title: z.string().max(80).optional(),
        description: z.string().max(600).optional(),
        captions: z.string().max(120).optional(),
        previewStart: z.number().min(0).optional(),
      }),
    )
    .default({}),
});
const videoMap = VideoMap.parse(
  JSON.parse(readFileSync(path.join(ROOT, "src", "content", "video-map.json"), "utf8")),
);

// ── videos ──────────────────────────────────────────────────────────
let meta = {};
try {
  meta = JSON.parse(readFileSync(path.join(WEB_DIR, "meta.json"), "utf8"));
} catch {
  /* optional: produced by `npm run media` */
}
const webFiles = new Set(listFiles(WEB_DIR, new Set([".mp4", ".webm", ".webp"])));
const videos = {};
// Sources: raw files in public/video/ AND optimised files in public/video/web/ (raw sources are
// git-ignored because of their size, so a clean checkout may only have the optimised versions).
const sources = new Map(); // id -> raw file name | null
for (const name of listFiles(VIDEO_DIR, VIDEO_EXT)) {
  const id = slugify(name);
  if (id) sources.set(id, name);
}
for (const name of webFiles) {
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.mp4$/.exec(name);
  if (!m || m[1] === "hero-loop" || m[1].endsWith("-preview")) continue;
  if (!sources.has(m[1])) sources.set(m[1], null);
}
for (const [id, name] of sources) {
  const optimised = webFiles.has(`${id}.mp4`);
  const dims = meta[id] ?? {};
  const details = videoMap.details[id] ?? {};
  const captions =
    details.captions && isSafeEntryName(details.captions) && details.captions.endsWith(".vtt")
      ? existsSync(path.join(VIDEO_DIR, "captions", details.captions))
        ? urlFor("video", "captions", details.captions)
        : (warn(`captions file video/captions/${details.captions} not found`), null)
      : null;
  if (!optimised)
    warn(`video "${name}" has no optimised version — run \`npm run media\` (needs ffmpeg).`);
  if (!optimised && !name) continue;
  videos[id] = {
    id,
    title: details.title?.trim() || (name ?? id).replace(/\.[^.]+$/, ""),
    description:
      details.description && !details.description.startsWith("PLACEHOLDER")
        ? details.description
        : null,
    src: optimised ? urlFor("video", "web", `${id}.mp4`) : urlFor("video", name ?? ""),
    preview: webFiles.has(`${id}-preview.mp4`) ? urlFor("video", "web", `${id}-preview.mp4`) : null,
    poster: webFiles.has(`${id}-poster.webp`) ? urlFor("video", "web", `${id}-poster.webp`) : null,
    width: Number(dims.width) || null,
    height: Number(dims.height) || null,
    duration: Number(dims.duration) || null,
    captions,
  };
}

let hero = null;
if (videoMap.hero) {
  const framesDir = path.join(WEB_DIR, "frames");
  const frames = listFiles(framesDir, new Set([".webp"])).filter((f) =>
    /^hero-\d{3}\.webp$/.test(f),
  );
  const hasLoop = webFiles.has("hero-loop.mp4");
  const base = videos[videoMap.hero.video];
  if (!base) warn(`hero video "${videoMap.hero.video}" not found in public/video/`);
  if (base || hasLoop) {
    hero = {
      loop: hasLoop ? "/video/web/hero-loop.mp4" : (base?.src ?? null),
      poster: webFiles.has("hero-poster.webp")
        ? "/video/web/hero-poster.webp"
        : (base?.poster ?? null),
      frameCount: frames.length,
      framePattern: frames.length > 0 ? "/video/web/frames/hero-{n}.webp" : null,
      title: base?.title ?? null,
      description: base?.description ?? null,
    };
  }
}

const assignments = {};
for (const [target, id] of Object.entries(videoMap.assignments)) {
  if (videos[id]) assignments[target] = id;
  else warn(`video-map assignment "${target}" -> "${id}": no such video in public/video/`);
}

// ── members & posters ───────────────────────────────────────────────
function imagesBySlug(dir, urlBase) {
  const out = {};
  for (const name of listFiles(dir, IMAGE_EXT)) {
    const slug = slugify(name);
    if (!SAFE_SLUG.test(slug)) continue;
    const buf = readFileSync(path.join(dir, name)).subarray(0, 16);
    if (!sniffImage(buf)) {
      warn(`${path.relative(ROOT, dir)}/${name} is not a real JPEG/PNG/WebP/AVIF — ignored`);
      continue;
    }
    if (out[slug])
      warn(`two images for "${slug}" in ${path.relative(ROOT, dir)} — using ${out[slug]}`);
    else out[slug] = urlFor(urlBase, name);
  }
  return out;
}
const members = imagesBySlug(MEMBERS_DIR, "members");
const posters = imagesBySlug(POSTERS_DIR, "posters");

// ── web apps ────────────────────────────────────────────────────────
const WebAppMeta = z
  .object({
    title: z.string().trim().min(1).max(60),
    description: z.string().trim().min(1).max(300),
    tags: z.array(z.string().trim().min(1).max(24)).max(6).default([]),
    thumbnail: z.string().max(120).optional(),
    liveUrl: z.string().max(2048).optional(),
    order: z.number().int().min(0).max(999).optional(),
  })
  .strict();

rmSync(GEN_PUBLIC, { recursive: true, force: true });
mkdirSync(GEN_PUBLIC, { recursive: true });
const webapps = [];
if (existsSync(WEBAPPS_DIR)) {
  for (const entry of readdirSync(WEBAPPS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || !isSafeEntryName(entry.name)) continue;
    const dir = path.join(WEBAPPS_DIR, entry.name);
    if (!isInside(WEBAPPS_DIR, dir)) continue;
    const slug = slugify(entry.name);
    if (!SAFE_SLUG.test(slug)) continue;
    const metaPath = path.join(dir, "meta.json");
    let raw;
    if (isRegularFile(metaPath) && isInside(dir, metaPath)) {
      if (statSync(metaPath).size > 16_384) {
        warn(`webapps/${entry.name}/meta.json is larger than 16 KB — ignored`);
        continue;
      }
      try {
        raw = JSON.parse(readFileSync(metaPath, "utf8"));
      } catch {
        warn(`webapps/${entry.name}/meta.json is not valid JSON — ignored`);
        continue;
      }
    } else if (isRegularFile(path.join(dir, "index.html"))) {
      raw = {
        title: entry.name.replace(/[-_]+/g, " "),
        description: "A web project built by Tekraze.",
      };
      warn(
        `webapps/${entry.name} has no meta.json — listed with a default title. Run \`npm run webapp:add\` to describe it.`,
      );
    } else continue;

    // prototype-pollution guard: JSON.parse can produce "__proto__" own keys; strict() rejects
    // any unknown key, including those.
    const parsed = WebAppMeta.safeParse(raw);
    if (!parsed.success) {
      warn(
        `webapps/${entry.name}/meta.json: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
      );
      continue;
    }
    const m = parsed.data;
    let thumbnail = null;
    if (m.thumbnail) {
      const t = m.thumbnail;
      const thumbPath = path.join(dir, t);
      if (!isSafeEntryName(t) || !IMAGE_EXT.has(path.extname(t).toLowerCase())) {
        warn(`webapps/${entry.name}: thumbnail must be a plain image file name inside the folder`);
      } else if (!isRegularFile(thumbPath) || !isInside(dir, thumbPath)) {
        warn(`webapps/${entry.name}: thumbnail ${t} not found`);
      } else if (statSync(thumbPath).size > 5 * 1024 * 1024) {
        warn(`webapps/${entry.name}: thumbnail is larger than 5 MB`);
      } else {
        const kind = sniffImage(readFileSync(thumbPath).subarray(0, 16));
        if (!kind) warn(`webapps/${entry.name}: thumbnail is not a real JPEG/PNG/WebP/AVIF`);
        else {
          const out = `${slug}.${kind}`;
          copyFileSync(thumbPath, path.join(GEN_PUBLIC, out));
          thumbnail = `/generated/webapps/${out}`;
        }
      }
    }
    const liveUrl = safeLiveUrl(m.liveUrl);
    if (m.liveUrl && !liveUrl)
      warn(`webapps/${entry.name}: liveUrl must be a public https:// URL — ignored`);
    webapps.push({
      slug,
      title: m.title,
      description: m.description,
      tags: m.tags,
      thumbnail,
      liveUrl,
      order: m.order ?? 500,
    });
  }
}
webapps.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
const frameOrigins = [
  ...new Set(webapps.flatMap((w) => (w.liveUrl ? [new URL(w.liveUrl).origin] : []))),
];

// ── write ───────────────────────────────────────────────────────────
mkdirSync(GEN_DIR, { recursive: true });
const write = (name, data) =>
  writeFileSync(path.join(GEN_DIR, name), JSON.stringify(data, null, 2) + "\n");
const showcase = {};
for (const [category, ids] of Object.entries(videoMap.showcase)) {
  showcase[category] = ids.filter((id) => {
    if (videos[id]) return true;
    warn(`video-map showcase "${category}" -> "${id}": no such video in public/video/`);
    return false;
  });
}
write("video-manifest.json", { videos, hero, assignments, showcase });
write("assets-manifest.json", { members, posters });
write("webapps-manifest.json", { webapps, frameOrigins });

console.log(
  `[manifests] ${Object.keys(videos).length} videos${hero ? " (hero ready" + (hero.frameCount ? `, ${hero.frameCount} scrub frames)` : ")") : ""}, ` +
    `${Object.keys(members).length} member photos, ${Object.keys(posters).length} poster overrides, ${webapps.length} web apps`,
);
for (const w of warnings) console.warn(`[manifests] warning: ${w}`);
