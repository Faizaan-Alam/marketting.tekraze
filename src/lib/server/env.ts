import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "@/lib/zod";

/**
 * Server environment, validated once. Secrets are only ever read here, never sent to the client.
 * See .env.example for documentation of each variable.
 */

const bool = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SITE_URL: z.url().default("https://services.tekraze.com"),
  /** Extra origins allowed to POST the form (comma separated), e.g. a staging URL. */
  ALLOWED_ORIGINS: z.string().default(""),
  CSRF_SECRET: z.string().min(32).optional(),
  /** Header that carries the real client IP, set by YOUR proxy (overwritten, not appended). */
  CLIENT_IP_HEADER: z
    .string()
    .regex(/^[a-z0-9-]{1,64}$/)
    .default("x-forwarded-for"),
  CAPTCHA_PROVIDER: z.enum(["turnstile", "none"]).default("turnstile"),
  TURNSTILE_SECRET_KEY: z.string().max(200).optional(),
  ENQUIRY_DELIVERY: z.enum(["smtp", "log"]).default("smtp"),
  SMTP_HOST: z.string().max(253).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().max(320).optional(),
  SMTP_PASS: z.string().max(1024).optional(),
  MAIL_FROM: z.string().max(320).optional(),
  MAIL_TO: z.string().max(320).optional(),
  RATE_LIMIT_PER_IP: z.coerce.number().int().min(1).max(1000).default(5),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(10),
  RATE_LIMIT_GLOBAL_PER_HOUR: z.coerce.number().int().min(1).max(100000).default(120),
  MIN_FILL_SECONDS: z.coerce.number().min(0).max(600).default(3),
});

export type ServerEnv = z.infer<typeof schema> & { csrfSecret: string; allowedOrigins: string[] };

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Names only — never print values.
    const bad = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${bad}`);
  }
  const env = parsed.data;
  // Without a configured secret, a per-process random one is used. Fine for one instance; set
  // CSRF_SECRET when running several instances so tokens validate everywhere.
  const csrfSecret = env.CSRF_SECRET ?? randomBytes(32).toString("hex");
  const site = new URL(env.SITE_URL).origin;
  const extra = env.ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .flatMap((o) => {
      try {
        return [new URL(o).origin];
      } catch {
        return [];
      }
    });
  cached = { ...env, csrfSecret, allowedOrigins: [site, ...extra] };
  return cached;
}

/** Test hook. */
export function resetServerEnvForTests(): void {
  cached = null;
}
