#!/usr/bin/env node
// Register a web app in the "Our Originals" row.
//
//   npm run webapp:add -- --title "My App" --description "What it does" \
//     --url https://myapp.example.com --tags "React,API" --thumbnail ~/Pictures/myapp.png
//
// Creates webapps/<slug>/meta.json and copies the thumbnail next to it. Then run `npm run dev`
// (or `npm run prepare-content`) and the card appears. The live URL is only ever shown inside a
// sandboxed iframe, and its origin is added to the CSP frame-src allow-list automatically.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { IMAGE_EXT, ROOT, SAFE_SLUG, isRegularFile, slugify, sniffImage } from "./lib/safe-fs.mjs";

const { values } = parseArgs({
  options: {
    title: { type: "string" },
    description: { type: "string" },
    url: { type: "string" },
    tags: { type: "string", default: "" },
    thumbnail: { type: "string" },
    slug: { type: "string" },
    force: { type: "boolean", default: false },
  },
  strict: true,
});

function fail(msg) {
  console.error(`[webapp:add] ${msg}`);
  process.exit(1);
}

if (!values.title || !values.description) fail("--title and --description are required.");
const slug = values.slug ? values.slug : slugify(values.title);
if (!SAFE_SLUG.test(slug)) fail("could not make a safe folder name; pass --slug my-app");
if (values.url) {
  let u;
  try {
    u = new URL(values.url);
  } catch {
    fail("--url is not a valid URL");
  }
  if (u.protocol !== "https:") fail("--url must start with https://");
}
const dir = path.join(ROOT, "webapps", slug);
if (existsSync(path.join(dir, "meta.json")) && !values.force)
  fail(`webapps/${slug}/meta.json already exists (use --force to overwrite)`);
mkdirSync(dir, { recursive: true });

let thumbnail;
if (values.thumbnail) {
  const src = path.resolve(values.thumbnail);
  if (!isRegularFile(src)) fail(`thumbnail ${src} not found`);
  const ext = path.extname(src).toLowerCase();
  if (!IMAGE_EXT.has(ext)) fail("thumbnail must be .jpg, .jpeg, .png, .webp or .avif");
  if (!sniffImage(readFileSync(src).subarray(0, 16))) fail("thumbnail is not a real image file");
  thumbnail = `thumbnail${ext}`;
  copyFileSync(src, path.join(dir, thumbnail));
}

const meta = {
  title: values.title.trim().slice(0, 60),
  description: values.description.trim().slice(0, 300),
  tags: values.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6),
  ...(thumbnail ? { thumbnail } : {}),
  ...(values.url ? { liveUrl: values.url } : {}),
};
writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(
  `[webapp:add] wrote webapps/${slug}/meta.json — run \`npm run prepare-content\` to rebuild the manifest.`,
);
