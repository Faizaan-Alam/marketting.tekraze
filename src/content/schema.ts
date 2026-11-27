import { z } from "@/lib/zod";
import { isSafeHttpsUrl } from "@/lib/urls";

/**
 * Schemas for every content file. Content is validated when the module loads, so a typo in a
 * data file fails the build (and the unit tests) instead of shipping a broken page.
 */

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slugs use lowercase letters, numbers and single dashes")
  .max(80);

export const httpsUrlSchema = z
  .string()
  .refine(isSafeHttpsUrl, "must be an absolute https:// URL to a public host");

const text = (max: number) => z.string().trim().min(1).max(max);

export const categoryIdSchema = z.enum(["brand", "content", "web", "video", "research"]);
export type CategoryId = z.infer<typeof categoryIdSchema>;

export const categorySchema = z
  .object({
    id: categoryIdSchema,
    episode: z.number().int().min(1).max(9),
    title: text(40),
    shortTitle: text(16),
    logline: text(160),
    /** Hue used for this category's generated poster art. */
    hue: z.number().int().min(0).max(360),
  })
  .strict();
export type Category = z.infer<typeof categorySchema>;

export const serviceOptionSchema = z.object({ title: text(40), description: text(240) }).strict();

export const serviceSchema = z
  .object({
    slug: slugSchema,
    category: categoryIdSchema,
    title: text(60),
    /** One line on the card. */
    summary: text(120),
    /** Full description in the detail modal. */
    description: text(600),
    included: z.array(text(120)).min(1).max(12),
    options: z.array(serviceOptionSchema).max(6).optional(),
    timeline: text(160),
    tags: z.array(text(24)).min(1).max(6),
    disclaimer: text(160).optional(),
    /** Position in the "Top 10 at Tekraze" row (editorial choice). Omit to leave it out. */
    topRank: z.number().int().min(1).max(10).optional(),
  })
  .strict();
export type Service = z.infer<typeof serviceSchema>;

export const bundleSchema = z
  .object({
    slug: slugSchema,
    title: text(40),
    badge: text(24),
    logline: text(200),
    audience: text(160),
    included: z.array(text(120)).min(1).max(10),
    addOns: z.array(text(120)).max(10),
  })
  .strict();
export type Bundle = z.infer<typeof bundleSchema>;

export const processStepSchema = z
  .object({ step: z.number().int().min(1).max(9), title: text(24), description: text(240) })
  .strict();
export type ProcessStep = z.infer<typeof processStepSchema>;

export const faqSchema = z
  .object({ id: slugSchema, question: text(120), answer: text(600) })
  .strict();
export type Faq = z.infer<typeof faqSchema>;

export const reasonSchema = z.object({ title: text(60), body: text(240) }).strict();
export type Reason = z.infer<typeof reasonSchema>;

export const timelineSchema = z.object({ work: text(120), time: text(40) }).strict();
export type TimelineRow = z.infer<typeof timelineSchema>;

export const socialNetworkSchema = z.enum([
  "facebook",
  "x",
  "instagram",
  "linkedin",
  "pinterest",
  "youtube",
  "telegram",
  "medium",
  "github",
  "website",
]);
export type SocialNetwork = z.infer<typeof socialNetworkSchema>;

export const socialLinkSchema = z
  .object({ network: socialNetworkSchema, label: text(40), url: httpsUrlSchema })
  .strict();
export type SocialLink = z.infer<typeof socialLinkSchema>;

export const memberSchema = z
  .object({
    slug: slugSchema,
    name: text(60),
    /** PLACEHOLDER when empty: the UI shows "Tekraze team" until you fill it in. */
    role: z.string().trim().max(60),
    /** PLACEHOLDER when empty: no bio is shown until you fill it in. */
    bio: z.string().trim().max(400),
    /** CSS object-position for the photo crop, e.g. "50% 30%". */
    photoFocus: z
      .string()
      .regex(/^\d{1,3}% \d{1,3}%$/)
      .default("50% 35%"),
    /** Colour of the generated initials avatar when there is no photo. */
    hue: z.number().int().min(0).max(360),
    socials: z.array(socialLinkSchema).max(8),
  })
  .strict();
export type Member = z.infer<typeof memberSchema>;

export const externalLinkSchema = z
  .object({ label: text(40), href: httpsUrlSchema, description: text(160).optional() })
  .strict();
export type ExternalLink = z.infer<typeof externalLinkSchema>;
