#!/usr/bin/env node
// Turns whatever is in public/video/ into web-ready files in public/video/web/:
//   <id>.mp4           H.264 + AAC, max 1280px, faststart (plays everywhere, incl. HEVC sources)
//   <id>-preview.mp4   6 s silent loop for card hover previews
//   <id>-poster.webp   poster frame
//   hero-loop.mp4 / hero-poster.webp / frames/hero-NNN.webp   for the hero (see video-map.json)
// Requires ffmpeg + ffprobe on PATH. Safe to run repeatedly: unchanged files are skipped.
// ffmpeg is always invoked with execFile and an argument array — never through a shell.
import { execFile } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import {
  ROOT,
  VIDEO_EXT,
  isInside,
  isNewer,
  isRegularFile,
  isSafeEntryName,
  slugify,
} from "./lib/safe-fs.mjs";

const run = promisify(execFile);
const SRC = path.join(ROOT, "public", "video");
const OUT = path.join(SRC, "web");
const FRAMES = path.join(OUT, "frames");
const MAP = JSON.parse(readFileSync(path.join(ROOT, "src", "content", "video-map.json"), "utf8"));

async function has(bin) {
  try {
    await run(bin, ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function probe(file) {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:stream_side_data=rotation:format=duration",
    "-of",
    "json",
    file,
  ]);
  const data = JSON.parse(stdout);
  const s = data.streams?.[0] ?? {};
  let width = Number(s.width) || 0;
  let height = Number(s.height) || 0;
  const rotation = Math.abs(Number(s.side_data_list?.[0]?.rotation ?? 0));
  if (rotation === 90 || rotation === 270) [width, height] = [height, width];
  return { width, height, duration: Number(data.format?.duration) || 0 };
}

const FIT_1280 = "scale=w=1280:h=1280:force_original_aspect_ratio=decrease:force_divisible_by=2";
const FIT_640 = "scale=w=640:h=640:force_original_aspect_ratio=decrease:force_divisible_by=2";
const H264 = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p"];

async function ffmpeg(args) {
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    maxBuffer: 1024 * 1024 * 16,
  });
}

async function main() {
  if (!(await has("ffmpeg")) || !(await has("ffprobe"))) {
    console.warn(
      "[media] ffmpeg/ffprobe not found — skipping optimisation. Original files will be used as-is.",
    );
    return;
  }
  if (!existsSync(SRC)) {
    console.log("[media] public/video/ does not exist — nothing to do.");
    return;
  }
  mkdirSync(OUT, { recursive: true });

  const meta = {};
  const sources = {};
  const entries = readdirSync(SRC, { withFileTypes: true }).filter(
    (e) =>
      e.isFile() && isSafeEntryName(e.name) && VIDEO_EXT.has(path.extname(e.name).toLowerCase()),
  );

  for (const entry of entries) {
    const file = path.join(SRC, entry.name);
    if (!isInside(SRC, file) || !isRegularFile(file)) {
      console.warn(
        `[media] skipping ${JSON.stringify(entry.name)} (not a regular file inside public/video)`,
      );
      continue;
    }
    const id = slugify(entry.name);
    if (!id) continue;
    const info = await probe(file);
    meta[id] = info;
    sources[id] = entry.name;
    const details = MAP.details?.[id] ?? {};
    const previewStart = Math.max(
      0,
      Math.min(
        Number(details.previewStart ?? info.duration * 0.1) || 0,
        Math.max(0, info.duration - 6),
      ),
    );

    const full = path.join(OUT, `${id}.mp4`);
    if (!isNewer(full, file)) {
      console.log(`[media] ${id}: encoding web version…`);
      await ffmpeg([
        "-i",
        file,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-vf",
        FIT_1280,
        ...H264,
        "-crf",
        "26",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        full,
      ]);
    }
    const preview = path.join(OUT, `${id}-preview.mp4`);
    if (!isNewer(preview, file)) {
      console.log(`[media] ${id}: encoding preview…`);
      await ffmpeg([
        "-ss",
        String(previewStart),
        "-i",
        file,
        "-t",
        "6",
        "-an",
        "-vf",
        FIT_640,
        ...H264,
        "-crf",
        "30",
        "-movflags",
        "+faststart",
        preview,
      ]);
    }
    const poster = path.join(OUT, `${id}-poster.webp`);
    if (!isNewer(poster, file)) {
      await ffmpeg([
        "-ss",
        String(previewStart + 0.5),
        "-i",
        file,
        "-frames:v",
        "1",
        "-vf",
        FIT_1280,
        "-c:v",
        "libwebp",
        "-quality",
        "72",
        poster,
      ]);
    }
    console.log(`[media] ${id}: ok (${info.width}×${info.height}, ${info.duration.toFixed(1)} s)`);
  }

  // ── hero ──────────────────────────────────────────────────────────
  const hero = MAP.hero;
  const heroSource = hero ? sources[hero.video] : undefined;
  if (hero && heroSource) {
    const file = path.join(SRC, heroSource);
    const loop = path.join(OUT, "hero-loop.mp4");
    const stamp = path.join(OUT, "hero.json");
    const wanted = JSON.stringify(hero);
    const fresh =
      existsSync(stamp) && readFileSync(stamp, "utf8") === wanted && isNewer(loop, file);
    if (!fresh) {
      console.log("[media] hero: encoding loop, poster and scrub frames…");
      await ffmpeg([
        "-ss",
        String(hero.loopStart),
        "-i",
        file,
        "-t",
        String(hero.loopSeconds),
        "-an",
        "-vf",
        FIT_1280,
        ...H264,
        "-crf",
        "29",
        "-g",
        "48",
        "-movflags",
        "+faststart",
        loop,
      ]);
      await ffmpeg([
        "-ss",
        String(hero.loopStart),
        "-i",
        file,
        "-frames:v",
        "1",
        "-vf",
        FIT_1280,
        "-c:v",
        "libwebp",
        "-quality",
        "62",
        path.join(OUT, "hero-poster.webp"),
      ]);
      rmSync(FRAMES, { recursive: true, force: true });
      mkdirSync(FRAMES, { recursive: true });
      const span = Math.max(1, hero.scrubEnd - hero.scrubStart);
      const fps = (hero.scrubFrames / span).toFixed(4);
      await ffmpeg([
        "-ss",
        String(hero.scrubStart),
        "-i",
        file,
        "-t",
        String(span),
        "-an",
        "-vf",
        `fps=${fps},scale=w=960:h=960:force_original_aspect_ratio=decrease:force_divisible_by=2`,
        "-c:v",
        "libwebp",
        "-quality",
        "48",
        path.join(FRAMES, "hero-%03d.webp"),
      ]);
      writeFileSync(stamp, wanted);
    }
  } else if (hero) {
    console.warn(
      `[media] hero video "${hero.video}" not found in public/video/ — hero uses its animated fallback.`,
    );
  }

  writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(`[media] done. Video ids: ${Object.keys(meta).join(", ") || "(none)"}`);
}

main().catch((err) => {
  console.error("[media] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
