import "server-only";
import {
  ENQUIRY_LIMITS,
  enquirySchema,
  fieldErrors,
  type Enquiry,
  type EnquiryResponse,
} from "@/lib/enquiry-schema";
import { verifyTurnstile, type CaptchaResult } from "./captcha";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  CSRF_MAX_AGE_SECONDS,
  issueCsrfToken,
  verifyCsrfToken,
} from "./csrf";
import { isMailConfigured, deliverEnquiry } from "./mailer";
import { SlidingWindowLimiter } from "./rate-limit";
import { hashIp, logSecurityEvent } from "./security-log";
import type { ServerEnv } from "./env";

/**
 * The enquiry endpoint, as plain functions over Request/Response so it can be unit tested.
 * Order of checks (cheapest first): method/content-type → size → origin → rate limits → CSRF +
 * time-to-submit → JSON + schema → honeypot → CAPTCHA → delivery.
 * Every failure returns a short generic message; details go to the security log only.
 */

export type HandlerDeps = {
  env: () => ServerEnv;
  verifyCaptcha?: (token: string, ip: string | null) => Promise<CaptchaResult>;
  deliver?: (env: ServerEnv, enquiry: Enquiry) => Promise<void>;
  now?: () => number;
};

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function json(
  body: EnquiryResponse | { token: string },
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...NO_STORE, ...extra } });
}

const fail = (
  status: number,
  code: Exclude<EnquiryResponse, { ok: true }>["code"],
  message: string,
  extra: Record<string, string> = {},
  fields?: Exclude<EnquiryResponse, { ok: true }>["fields"],
) => json({ ok: false, code, message, ...(fields ? { fields } : {}) }, status, extra);

const GENERIC = "We couldn't send your enquiry. Please reload the page and try again.";

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || null;
  }
  return null;
}

export function clientIp(req: Request, headerName: string): string | null {
  const raw = req.headers.get(headerName);
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim() ?? "";
  // IPv4, or IPv6 characters only — anything else is ignored
  return /^[0-9a-fA-F:.]{2,45}$/.test(first) ? first : null;
}

function originAllowed(req: Request, env: ServerEnv): boolean {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  if (!origin) return false;
  if (env.allowedOrigins.includes(origin)) return true;
  // Development convenience: the dev server itself (http://localhost:PORT)
  if (env.NODE_ENV !== "production") {
    try {
      const u = new URL(origin);
      return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }
  return false;
}

export function createEnquiryHandlers(deps: HandlerDeps) {
  const now = deps.now ?? Date.now;
  let perIp: SlidingWindowLimiter | null = null;
  let global: SlidingWindowLimiter | null = null;
  let tokens: SlidingWindowLimiter | null = null;
  let warnedNoCaptcha = false;
  /** Tokens already used for an accepted enquiry (single-use), pruned when they expire. */
  const usedTokens = new Map<string, number>();
  const MAX_USED = 20_000;

  function markUsed(token: string, expiresAt: number): void {
    const t = now();
    if (usedTokens.size >= MAX_USED) {
      for (const [k, exp] of usedTokens) if (exp <= t) usedTokens.delete(k);
      while (usedTokens.size >= MAX_USED) {
        const first = usedTokens.keys().next();
        if (first.done) break;
        usedTokens.delete(first.value);
      }
    }
    usedTokens.set(token, expiresAt);
  }

  function limiters(env: ServerEnv) {
    perIp ??= new SlidingWindowLimiter(
      env.RATE_LIMIT_PER_IP,
      env.RATE_LIMIT_WINDOW_MINUTES * 60_000,
    );
    global ??= new SlidingWindowLimiter(env.RATE_LIMIT_GLOBAL_PER_HOUR, 60 * 60_000, 1);
    tokens ??= new SlidingWindowLimiter(30, 10 * 60_000);
    return { perIp, global, tokens };
  }

  async function GET(req: Request): Promise<Response> {
    let env: ServerEnv;
    try {
      env = deps.env();
    } catch {
      logSecurityEvent("config_error");
      return fail(503, "unavailable", "The enquiry form is unavailable right now.");
    }
    const ip = clientIp(req, env.CLIENT_IP_HEADER) ?? "unknown";
    const ipHash = hashIp(ip, env.csrfSecret);
    const limit = limiters(env).tokens.take(ipHash, now());
    if (!limit.allowed) {
      logSecurityEvent("rate_limited", { ip: ipHash, stage: "token" });
      return fail(
        429,
        "rate_limited",
        "Too many requests. Please wait a few minutes and try again.",
        {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      );
    }
    const token = issueCsrfToken(env.csrfSecret, now());
    const cookie = `${CSRF_COOKIE}=${token}; Path=/; Max-Age=${CSRF_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
    return json({ token }, 200, { "Set-Cookie": cookie });
  }

  async function POST(req: Request): Promise<Response> {
    let env: ServerEnv;
    try {
      env = deps.env();
    } catch {
      logSecurityEvent("config_error");
      return fail(503, "unavailable", "The enquiry form is unavailable right now.");
    }
    const ip = clientIp(req, env.CLIENT_IP_HEADER);
    const ipHash = hashIp(ip ?? "unknown", env.csrfSecret);

    // 1. content type + size (declared and actual)
    const type = req.headers.get("content-type") ?? "";
    if (!type.toLowerCase().startsWith("application/json")) {
      logSecurityEvent("bad_content_type", { ip: ipHash });
      return fail(415, "invalid", GENERIC);
    }
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > ENQUIRY_LIMITS.bodyBytes) {
      logSecurityEvent("body_too_large", { ip: ipHash, bytes: declared });
      return fail(413, "invalid", "Your message is too long.");
    }

    // 2. origin
    if (!originAllowed(req, env)) {
      logSecurityEvent("origin_rejected", { ip: ipHash });
      return fail(403, "forbidden", GENERIC);
    }

    // 3. rate limits (per IP, then global)
    const { perIp: ipLimiter, global: globalLimiter } = limiters(env);
    const ipLimit = ipLimiter.take(ipHash, now());
    if (!ipLimit.allowed) {
      logSecurityEvent("rate_limited", { ip: ipHash, stage: "submit" });
      return fail(
        429,
        "rate_limited",
        "You've sent several enquiries in a short time. Please wait a few minutes.",
        {
          "Retry-After": String(ipLimit.retryAfterSeconds),
        },
      );
    }
    const globalLimit = globalLimiter.take("all", now());
    if (!globalLimit.allowed) {
      logSecurityEvent("global_limited");
      return fail(
        429,
        "rate_limited",
        "We're receiving a lot of enquiries. Please try again later.",
        {
          "Retry-After": String(globalLimit.retryAfterSeconds),
        },
      );
    }

    // 4. CSRF + time-to-submit
    const csrf = verifyCsrfToken(
      env.csrfSecret,
      req.headers.get(CSRF_HEADER),
      readCookie(req.headers.get("cookie"), CSRF_COOKIE),
      { now: now(), minAgeMs: env.MIN_FILL_SECONDS * 1000 },
    );
    const presented = req.headers.get(CSRF_HEADER) ?? "";
    if (csrf.ok && usedTokens.has(presented)) {
      logSecurityEvent("csrf_failed", { ip: ipHash, reason: "replay" });
      return fail(403, "forbidden", "Your session expired. Please reload the page and try again.");
    }
    if (!csrf.ok) {
      logSecurityEvent("csrf_failed", { ip: ipHash, reason: csrf.reason });
      return csrf.reason === "too_fast"
        ? fail(400, "forbidden", "That was quick! Please check your details and send again.")
        : fail(403, "forbidden", "Your session expired. Please reload the page and try again.");
    }

    // 5. body: stream-limited read, JSON parse, schema
    let raw: string;
    try {
      raw = await readLimited(req, ENQUIRY_LIMITS.bodyBytes);
    } catch {
      logSecurityEvent("body_too_large", { ip: ipHash });
      return fail(413, "invalid", "Your message is too long.");
    }
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      logSecurityEvent("enquiry_invalid", { ip: ipHash, reason: "json" });
      return fail(400, "invalid", GENERIC);
    }
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      logSecurityEvent("enquiry_invalid", { ip: ipHash, reason: "shape" });
      return fail(400, "invalid", GENERIC);
    }
    const parsed = enquirySchema.safeParse(data);
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      logSecurityEvent("enquiry_invalid", {
        ip: ipHash,
        reason: "schema",
        issues: parsed.error.issues.length,
      });
      return fail(
        422,
        "invalid",
        "Please check the highlighted fields.",
        {},
        Object.keys(fields).length ? fields : undefined,
      );
    }
    const enquiry = parsed.data;

    // 6. honeypot — pretend success so bots learn nothing
    if (enquiry.website.length > 0) {
      logSecurityEvent("honeypot", { ip: ipHash });
      return json({ ok: true });
    }

    // 7. CAPTCHA
    if (env.CAPTCHA_PROVIDER === "turnstile") {
      const verify =
        deps.verifyCaptcha ?? ((t, i) => verifyTurnstile(t, env.TURNSTILE_SECRET_KEY, i));
      const result = await verify(enquiry.captchaToken, ip);
      if (!result.ok) {
        logSecurityEvent("captcha_failed", { ip: ipHash, reason: result.reason });
        return fail(400, "captcha", "Please complete the verification check and try again.");
      }
    } else if (!warnedNoCaptcha && env.NODE_ENV === "production") {
      warnedNoCaptcha = true;
      logSecurityEvent("config_error", { detail: "CAPTCHA_PROVIDER=none in production" });
    }

    // 8. deliver
    if (env.ENQUIRY_DELIVERY === "smtp" && !isMailConfigured(env)) {
      logSecurityEvent("config_error", { detail: "SMTP not configured" });
      return fail(
        503,
        "unavailable",
        "The enquiry form is unavailable right now. Please try again later.",
      );
    }
    try {
      await (deps.deliver ?? deliverEnquiry)(env, enquiry);
    } catch {
      logSecurityEvent("delivery_failed", { ip: ipHash });
      return fail(
        502,
        "unavailable",
        "We couldn't send your enquiry just now. Please try again in a few minutes.",
      );
    }
    markUsed(presented, csrf.issuedAt + CSRF_MAX_AGE_SECONDS * 1000);
    logSecurityEvent("enquiry_accepted", { ip: ipHash, service: enquiry.service });
    // rotate the token so the same token cannot be replayed
    return json({ ok: true }, 200, {
      "Set-Cookie": `${CSRF_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
    });
  }

  return { GET, POST };
}

/** Read the body with a hard byte cap, even if Content-Length lies or is absent. */
export async function readLimited(req: Request, maxBytes: number): Promise<string> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("too large");
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}
