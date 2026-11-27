import { z } from "@/lib/zod";
import {
  externalLinkSchema,
  faqSchema,
  processStepSchema,
  reasonSchema,
  socialLinkSchema,
  timelineSchema,
  type ExternalLink,
  type Faq,
  type ProcessStep,
  type Reason,
  type SocialLink,
  type TimelineRow,
} from "./schema";

/**
 * Site-wide copy and links. Source: https://tekraze.com/digital-marketing-services/ and the
 * tekraze.com header/footer (links read from the live site on 2026-11-27).
 */

export const site = {
  name: "Tekraze Services",
  shortName: "services.tekraze",
  url: "https://services.tekraze.com",
  mainSite: "https://tekraze.com",
  title: "Digital Marketing Services: 5 Best Ways We Help You Grow | Tekraze",
  description:
    "Tekraze digital marketing services in five categories: brand & design, content & SEO, websites & apps, video & social, and research & analysis. Tell us what you need and we reply with a plan.",
  headline: "Five ways we help you grow.",
  tagline:
    "Brand, content, web, video and research from one team. Tell us what you need and we reply with a plan.",
  primaryCta: "Get a free quote",
  secondaryCta: "Ask about the bundle",
  formNote: "Enquiries are handled only through this form.",
} as const;

export const processSteps: ReadonlyArray<ProcessStep> = z.array(processStepSchema).parse([
  {
    step: 1,
    title: "Enquire",
    description: "Submit the form with your contact details and the service you need.",
  },
  {
    step: 2,
    title: "Chat",
    description:
      "Tekraze replies within 1 to 2 business days to clarify your goals, timeline and budget.",
  },
  {
    step: 3,
    title: "Quote",
    description: "You receive a custom quote with the scope, milestones and a delivery date.",
  },
  {
    step: 4,
    title: "Build",
    description:
      "The work is designed, written, developed or researched, with updates along the way.",
  },
  {
    step: 5,
    title: "Deliver",
    description: "You review, Tekraze revises, then the files or the live site are handed over.",
  },
]);

export const reasons: ReadonlyArray<Reason> = z.array(reasonSchema).parse([
  {
    title: "One team, five categories",
    body: "One point of contact for all five categories, with specialist partners where needed.",
  },
  {
    title: "Years of publishing",
    body: "Tekraze has published tech guides for years, with SEO and clarity built in.",
  },
  {
    title: "Custom quotes only",
    body: "No public price list and no hidden extras. Every quote follows a short discovery chat.",
  },
]);

export const timelines: ReadonlyArray<TimelineRow> = z.array(timelineSchema).parse([
  { work: "Resume analysis, resume polish, short promo videos", time: "A few days" },
  { work: "A new resume from scratch", time: "About one week" },
  { work: "Marketing website, content strategy or research report", time: "One to three weeks" },
]);

export const faqs: ReadonlyArray<Faq> = z.array(faqSchema).parse([
  {
    id: "cost",
    question: "How much does it cost?",
    answer:
      "We work on custom quotes only, with no hidden extras. There is no public price list: your quote follows a short discovery chat about what you need.",
  },
  {
    id: "services",
    question: "What services do you offer?",
    answer:
      "Five categories: Brand & Design, Content & SEO, Websites & Apps, Video & Social, and Research & Analysis. You can also combine them in the Growth Bundle.",
  },
  {
    id: "timeline",
    question: "How long does it take?",
    answer:
      "Resume analysis, resume polish and short promo videos take a few days. A new resume from scratch takes about one week. A marketing website, content strategy or research report takes one to three weeks.",
  },
  {
    id: "social",
    question: "Do you do monthly social media management?",
    answer: "Yes: monthly calendars, posting plans, creatives and captions.",
  },
  {
    id: "crypto",
    question: "Is the crypto analysis financial advice?",
    answer: "No. It is research and education only. Informational only, not financial advice.",
  },
  {
    id: "after-submit",
    question: "What happens after I submit the form?",
    answer: "You get a reply within 1 to 2 business days, plus a call if needed.",
  },
]);

/** Links to the main Tekraze site (nav "More from Tekraze" + the "Continue exploring" row). */
export const mainSiteLinks: ReadonlyArray<ExternalLink> = z.array(externalLinkSchema).parse([
  {
    label: "Guides",
    href: "https://tekraze.com/category/developer-guide/",
    description: "Developer, web, PC and Android guides from the Tekraze blog.",
  },
  {
    label: "Services",
    href: "https://tekraze.com/digital-marketing-services/",
    description: "The services page on the main Tekraze site.",
  },
  {
    label: "Resume Analyzer",
    href: "https://tekraze.com/resume-analyzer/",
    description: "Tekraze's resume analysis tool.",
  },
  {
    label: "Crypto Tools",
    href: "https://tekraze.com/crypto-tools/",
    description: "Tekraze's crypto tools.",
  },
]);

export const footerLinks: ReadonlyArray<ExternalLink> = z.array(externalLinkSchema).parse([
  { label: "About Us", href: "https://tekraze.com/about-3/" },
  { label: "Contact Us", href: "https://tekraze.com/contact-us/" },
  { label: "Privacy Policy", href: "https://tekraze.com/privacy-policy/" },
  { label: "Disclaimer", href: "https://tekraze.com/disclaimer/" },
  { label: "Work with us", href: "https://tekraze.com/work-with-us/" },
  { label: "Affiliate Disclosure", href: "https://tekraze.com/affiliate-disclosure/" },
]);

/** Official profiles, copied from the tekraze.com footer. */
export const socialLinks: ReadonlyArray<SocialLink> = z.array(socialLinkSchema).parse([
  { network: "facebook", label: "Facebook", url: "https://facebook.com/tekraze" },
  { network: "x", label: "X (Twitter)", url: "https://twitter.com/tekraze" },
  { network: "instagram", label: "Instagram", url: "https://instagram.com/@tekraze786" },
  { network: "linkedin", label: "LinkedIn", url: "https://in.linkedin.com/company/tekraze" },
  { network: "pinterest", label: "Pinterest", url: "https://in.pinterest.com/balvinder294/" },
  { network: "youtube", label: "YouTube", url: "https://www.youtube.com/@tekraze-gaming" },
  { network: "telegram", label: "Telegram", url: "https://t.me/s/tekraze" },
  { network: "medium", label: "Medium", url: "https://medium.com/tekraze" },
]);

/** In-page sections, used by the nav and the sitemap of anchors. */
export const navSections = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "web-apps", label: "Web Apps" },
  { id: "team", label: "Team" },
  { id: "process", label: "Process" },
  { id: "faq", label: "FAQ" },
] as const;
