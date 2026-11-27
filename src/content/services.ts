import { z } from "@/lib/zod";
import {
  bundleSchema,
  categorySchema,
  serviceSchema,
  type Bundle,
  type Category,
  type CategoryId,
  type Service,
} from "./schema";

/**
 * SERVICES — source: https://tekraze.com/digital-marketing-services/
 * To add a service: copy one object in `services`, give it a new unique `slug`, pick a
 * `category`, and fill the fields. It appears in its row, in search, in the enquiry form's
 * Service dropdown and in the JSON-LD automatically. Never add prices, stats or testimonials.
 */

export const categories: ReadonlyArray<Category> = z.array(categorySchema).parse([
  {
    id: "brand",
    episode: 1,
    title: "Brand & Design",
    shortTitle: "Brand",
    logline:
      "Logos, banners, social posts and product visuals that look like they belong together.",
    hue: 352,
  },
  {
    id: "content",
    episode: 2,
    title: "Content & SEO",
    shortTitle: "Content",
    logline: "Researched writing, content plans and resumes, built to be found and read.",
    hue: 36,
  },
  {
    id: "web",
    episode: 3,
    title: "Websites & Apps",
    shortTitle: "Web",
    logline: "Fast, clean sites that explain your offer and capture leads, plus builds on request.",
    hue: 192,
  },
  {
    id: "video",
    episode: 4,
    title: "Video & Social",
    shortTitle: "Video",
    logline: "Short vertical promos and a steady, planned presence on social media.",
    hue: 318,
  },
  {
    id: "research",
    episode: 5,
    title: "Research & Analysis",
    shortTitle: "Research",
    logline: "Plain-language research on markets, competitors, audiences and crypto.",
    hue: 232,
  },
]);

export const services: ReadonlyArray<Service> = z.array(serviceSchema).parse([
  // ── Brand & Design ─────────────────────────────────────────────
  {
    slug: "graphic-design",
    category: "brand",
    title: "Graphic design",
    summary: "Logos, banners, social posts, thumbnails and brand visuals.",
    description:
      "Design work for your brand: logos, banners, social media posts, video thumbnails and the brand visuals that tie them together.",
    included: ["Logos", "Banners", "Social media posts", "Thumbnails", "Brand visuals"],
    timeline: "Confirmed in your custom quote after a short discovery chat.",
    tags: ["Logos", "Social", "Thumbnails"],
    topRank: 3,
  },
  {
    slug: "image-editing",
    category: "brand",
    title: "Image editing",
    summary: "Product photos, banners and social graphics, resized for each platform.",
    description:
      "Editing for product photos, banners and social graphics, with each image resized for the platforms you publish on.",
    included: [
      "Product photo editing",
      "Banner editing",
      "Social graphics",
      "Resizing for each platform",
    ],
    timeline: "Confirmed in your custom quote after a short discovery chat.",
    tags: ["Photos", "Resizing"],
  },

  // ── Content & SEO ──────────────────────────────────────────────
  {
    slug: "blog-writing-seo",
    category: "content",
    title: "Blog writing & SEO",
    summary: "Researched posts with SEO titles, meta descriptions and internal links.",
    description:
      "Researched blog posts written with SEO titles, meta descriptions and internal links, following Rank Math practices and Google's SEO Starter Guide.",
    included: [
      "Researched blog posts",
      "SEO titles",
      "Meta descriptions",
      "Internal links",
      "Rank Math practices and Google's SEO Starter Guide",
    ],
    timeline: "Confirmed in your custom quote after a short discovery chat.",
    tags: ["SEO", "Blogging"],
    topRank: 2,
  },
  {
    slug: "content-strategy",
    category: "content",
    title: "Content strategy",
    summary: "Plans covering topics, keywords, calendars and channels.",
    description:
      "A content plan that covers the topics to write about, the keywords to target, a publishing calendar and the channels to use.",
    included: ["Topics", "Keywords", "Content calendar", "Channels"],
    timeline: "One to three weeks.",
    tags: ["Planning", "Keywords"],
    topRank: 6,
  },
  {
    slug: "resume-services",
    category: "content",
    title: "Resume services",
    summary: "Resume analysis, optimisation or a new resume from scratch.",
    description:
      "Three options for your resume: an analysis of the one you have, a keyword-friendly polish with LinkedIn refinement, or a new resume written from scratch.",
    included: ["Pick one of three options: Analysis, Optimisation or Creation"],
    options: [
      {
        title: "Analysis",
        description:
          "A review of your existing resume for ATS gaps, structure, keywords and impact.",
      },
      {
        title: "Optimisation",
        description: "A keyword-friendly polish of your resume, plus LinkedIn refinement.",
      },
      {
        title: "Creation",
        description: "A new resume from scratch, or a heavy rewrite of your current one.",
      },
    ],
    timeline: "Analysis or polish: a few days. A new resume from scratch: about one week.",
    tags: ["Resume", "ATS", "LinkedIn"],
    topRank: 5,
  },

  // ── Websites & Apps ────────────────────────────────────────────
  {
    slug: "marketing-website",
    category: "web",
    title: "Marketing website",
    summary: "A fast, clean site that explains your offer and captures leads.",
    description:
      "A fast, clean marketing website that explains what you offer and captures leads from interested visitors.",
    included: ["Fast, clean design", "Clear explanation of your offer", "Lead capture"],
    timeline: "One to three weeks.",
    tags: ["Website", "Leads"],
    topRank: 1,
  },
  {
    slug: "wordpress-react-builds",
    category: "web",
    title: "WordPress & React builds",
    summary: "Blogs, landing pages, small web apps, and APIs on request.",
    description:
      "Builds in WordPress or React: blogs, landing pages and small web apps, with APIs available on request.",
    included: ["Blogs", "Landing pages", "Small web apps", "APIs on request"],
    timeline: "Confirmed in your custom quote after a short discovery chat.",
    tags: ["WordPress", "React", "APIs"],
    topRank: 4,
  },

  // ── Video & Social ─────────────────────────────────────────────
  {
    slug: "short-promo-videos",
    category: "video",
    title: "Short promo videos",
    summary: "Vertical Shorts and Reels-style videos for launches and products.",
    description:
      "Short vertical promo videos in the style of YouTube Shorts and Instagram Reels, made for launches and products.",
    included: ["Vertical format", "Shorts and Reels style", "For launches and products"],
    timeline: "A few days.",
    tags: ["Shorts", "Reels", "Launches"],
    topRank: 7,
  },
  {
    slug: "social-media-management",
    category: "video",
    title: "Social media management",
    summary: "Monthly calendars, posting plans, creatives and captions.",
    description:
      "Monthly social media management: content calendars, posting plans, creatives and captions, sometimes delivered with partners.",
    included: ["Monthly calendars", "Posting plans", "Creatives", "Captions"],
    timeline: "Runs month by month.",
    tags: ["Monthly", "Social"],
    topRank: 8,
  },

  // ── Research & Analysis ────────────────────────────────────────
  {
    slug: "crypto-analysis",
    category: "research",
    title: "Crypto analysis",
    summary: "Plain-language research on tokens, projects and trends.",
    description:
      "Plain-language research on crypto tokens, projects and trends, written for people who want to understand them.",
    included: ["Token research", "Project research", "Trend research", "Plain-language write-up"],
    timeline: "One to three weeks.",
    tags: ["Crypto", "Research"],
    disclaimer: "Informational only, not financial advice.",
    topRank: 10,
  },
  {
    slug: "market-business-analysis",
    category: "research",
    title: "Market & business analysis",
    summary: "Competitor, audience and market research turned into a short brief.",
    description:
      "Research into your competitors, your audience and your market, turned into a short brief you can act on.",
    included: ["Competitor research", "Audience research", "Market research", "A short brief"],
    timeline: "One to three weeks.",
    tags: ["Market", "Competitors", "Audience"],
    topRank: 9,
  },
]);

export const growthBundle: Bundle = bundleSchema.parse({
  slug: "growth-bundle",
  title: "The Growth Bundle",
  badge: "Tekraze Original",
  logline:
    "Everything a launch or relaunch needs, from brand to video, run in one shared update thread.",
  audience: "For launches or relaunches, with one shared update thread.",
  included: [
    "Brand starter graphics (logo options or a social pack)",
    "2 SEO blog posts",
    "A landing page or site refresh plan",
    "A 30-day content calendar",
    "2 short promo videos",
  ],
  addOns: [
    "Extra SEO posts or promo videos",
    "A full marketing website",
    "A month of social media management",
    "A crypto report",
    "A market analysis",
  ],
});

// ── integrity checks (run at build time and in unit tests) ──────────
const slugs = new Set<string>();
for (const s of [...services.map((x) => x.slug), growthBundle.slug]) {
  if (slugs.has(s)) throw new Error(`Duplicate service slug: ${s}`);
  slugs.add(s);
}
const ranks = services.flatMap((s) => (s.topRank ? [s.topRank] : []));
if (new Set(ranks).size !== ranks.length) throw new Error("Two services share a topRank");

export function servicesByCategory(id: CategoryId): ReadonlyArray<Service> {
  return services.filter((s) => s.category === id);
}

export function categoryById(id: CategoryId): Category {
  const found = categories.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category ${id}`);
  return found;
}

export const topTen: ReadonlyArray<Service> = services
  .filter((s): s is Service & { topRank: number } => typeof s.topRank === "number")
  .sort((a, b) => a.topRank - b.topRank);

/** Allow-listed values for the enquiry form's Service field (client AND server). */
export const SERVICE_OTHER = "Other";
export const enquiryServiceOptions: ReadonlyArray<string> = [
  ...services.map((s) => s.title),
  growthBundle.title.replace(/^The /, ""),
  SERVICE_OTHER,
];
