import { z } from "@/lib/zod";
import videoManifestJson from "@/generated/video-manifest.json";
import assetsManifestJson from "@/generated/assets-manifest.json";
import webappsManifestJson from "@/generated/webapps-manifest.json";
import { isSafeHttpsUrl } from "./urls";

/**
 * Typed, validated access to the generated manifests. The manifests are produced by
 * scripts/build-manifests.mjs; validating them again here means a hand-edited or corrupted
 * manifest can never inject an unexpected URL into the page.
 */

const localPath = z
  .string()
  .max(300)
  .regex(/^\/(video|members|posters|generated)\/[A-Za-z0-9%._\-/]+$/, "local public path")
  .refine((p) => !p.includes("..") && !p.includes("//"), "no traversal");

const videoSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().max(120),
  description: z.string().max(600).nullable(),
  src: localPath,
  preview: localPath.nullable(),
  poster: localPath.nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  duration: z.number().nullable(),
  captions: localPath.nullable(),
});
export type VideoAsset = z.infer<typeof videoSchema>;

const heroSchema = z.object({
  loop: localPath.nullable(),
  poster: localPath.nullable(),
  frameCount: z.number().int().min(0).max(400),
  framePattern: z
    .string()
    .regex(/^\/video\/web\/frames\/hero-\{n\}\.webp$/)
    .nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
});
export type HeroMedia = z.infer<typeof heroSchema>;

const videoManifest = z
  .object({
    videos: z.record(z.string(), videoSchema),
    hero: heroSchema.nullable(),
    assignments: z.record(z.string(), z.string()),
  })
  .parse(videoManifestJson);

const assetsManifest = z
  .object({
    members: z.record(z.string(), localPath),
    posters: z.record(z.string(), localPath),
  })
  .parse(assetsManifestJson);

const webAppSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(300),
  tags: z.array(z.string().max(24)).max(6),
  thumbnail: localPath.nullable(),
  liveUrl: z.string().refine(isSafeHttpsUrl).nullable(),
  order: z.number(),
});
export type WebApp = z.infer<typeof webAppSchema>;

const webappsManifest = z
  .object({
    webapps: z.array(webAppSchema),
    frameOrigins: z.array(z.string().regex(/^https:\/\/[a-z0-9.-]+(:\d+)?$/i)),
  })
  .parse(webappsManifestJson);

export const heroMedia: HeroMedia | null = videoManifest.hero;
export const webApps: ReadonlyArray<WebApp> = webappsManifest.webapps;
export const webAppFrameOrigins: ReadonlyArray<string> = webappsManifest.frameOrigins;

export function videoFor(target: string): VideoAsset | null {
  const id = videoManifest.assignments[target];
  return id ? (videoManifest.videos[id] ?? null) : null;
}

export function memberPhoto(slug: string): string | null {
  return assetsManifest.members[slug] ?? null;
}

export function posterOverride(slug: string): string | null {
  return assetsManifest.posters[slug] ?? null;
}

export function heroFrameUrl(index: number): string | null {
  if (!heroMedia?.framePattern) return null;
  const n = String(Math.min(Math.max(1, index), heroMedia.frameCount)).padStart(3, "0");
  return heroMedia.framePattern.replace("{n}", n);
}
