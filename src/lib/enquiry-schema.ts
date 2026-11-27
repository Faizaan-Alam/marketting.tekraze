import { z } from "@/lib/zod";
import { enquiryServiceOptions } from "@/content/services";
import { cleanText } from "./sanitize";

/**
 * The single source of truth for the enquiry form. Used by the form for instant feedback and by
 * the API route as the authoritative check. Unknown fields are rejected (`strict`).
 */

export const ENQUIRY_LIMITS = {
  name: 60,
  email: 254,
  messageMin: 10,
  messageMax: 2000,
  token: 2048,
  bodyBytes: 16 * 1024,
} as const;

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

const nameField = (label: string) =>
  z.preprocess(
    (v) => cleanText(v, ENQUIRY_LIMITS.name + 1),
    z
      .string()
      .min(1, `Enter your ${label.toLowerCase()}.`)
      .max(ENQUIRY_LIMITS.name, `${label} must be ${ENQUIRY_LIMITS.name} characters or fewer.`)
      .regex(
        NAME_PATTERN,
        `${label} can only contain letters, spaces, apostrophes, dots and dashes.`,
      ),
  );

export const enquirySchema = z
  .object({
    firstName: nameField("First name"),
    lastName: nameField("Last name"),
    email: z.preprocess(
      (v) => cleanText(v, ENQUIRY_LIMITS.email + 1).toLowerCase(),
      z
        .string()
        .min(1, "Enter your email address.")
        .max(ENQUIRY_LIMITS.email, "That email address is too long.")
        .pipe(z.email("Enter a valid email address, like name@example.com.")),
    ),
    service: z.preprocess(
      (v) => cleanText(v, 80),
      z.enum(enquiryServiceOptions as [string, ...string[]], {
        error: "Choose a service from the list.",
      }),
    ),
    message: z.preprocess(
      (v) => cleanText(v, ENQUIRY_LIMITS.messageMax + 1, true),
      z
        .string()
        .min(
          ENQUIRY_LIMITS.messageMin,
          `Tell us a little more (at least ${ENQUIRY_LIMITS.messageMin} characters).`,
        )
        .max(
          ENQUIRY_LIMITS.messageMax,
          `Keep your message under ${ENQUIRY_LIMITS.messageMax} characters.`,
        ),
    ),
    /** Honeypot: hidden from people, filled by naive bots. Must be empty. */
    website: z.string().max(200).optional().default(""),
    /** CAPTCHA response token (Turnstile). Verified server-side. */
    captchaToken: z.string().max(ENQUIRY_LIMITS.token).optional().default(""),
  })
  .strict();

export type EnquiryInput = z.input<typeof enquirySchema>;
export type Enquiry = z.output<typeof enquirySchema>;
export type EnquiryField = "firstName" | "lastName" | "email" | "service" | "message";

export const ENQUIRY_FIELDS: ReadonlyArray<EnquiryField> = [
  "firstName",
  "lastName",
  "email",
  "service",
  "message",
];

/** Field-level messages from our own schema (never echoes the submitted value). */
export function fieldErrors(error: z.ZodError): Partial<Record<EnquiryField, string>> {
  const out: Partial<Record<EnquiryField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && (ENQUIRY_FIELDS as ReadonlyArray<string>).includes(key)) {
      const field = key as EnquiryField;
      out[field] ??= issue.message;
    }
  }
  return out;
}

export type EnquiryResponse =
  | { ok: true }
  | {
      ok: false;
      code: "invalid" | "rate_limited" | "forbidden" | "captcha" | "unavailable" | "error";
      message: string;
      fields?: Partial<Record<EnquiryField, string>>;
    };
