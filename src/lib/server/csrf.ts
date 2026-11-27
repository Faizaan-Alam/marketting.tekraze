import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed double-submit CSRF token.
 *   token  = <issuedAt base36>.<random 128-bit hex>.<HMAC-SHA256(secret, issuedAt.random)>
 * The token is set in an HttpOnly, Secure, SameSite=Strict `__Host-` cookie AND returned to the
 * page, which echoes it in the X-CSRF-Token header. A POST is accepted only when both copies are
 * identical, the signature is valid, and the age is inside the allowed window. The issue time
 * doubles as the time-to-submit check (bots that post instantly are rejected).
 */

export const CSRF_COOKIE = "__Host-tz-enquiry";
export const CSRF_HEADER = "x-csrf-token";
export const CSRF_MAX_AGE_SECONDS = 2 * 60 * 60;

const TOKEN_PATTERN = /^[0-9a-z]{6,12}\.[0-9a-f]{32}\.[0-9a-f]{64}$/;

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function issueCsrfToken(secret: string, now = Date.now()): string {
  const payload = `${now.toString(36)}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(secret, payload)}`;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export type CsrfCheck =
  | { ok: true; issuedAt: number }
  | {
      ok: false;
      reason: "missing" | "mismatch" | "malformed" | "signature" | "expired" | "too_fast";
    };

export function verifyCsrfToken(
  secret: string,
  headerToken: string | null,
  cookieToken: string | null,
  options: { now?: number; minAgeMs: number; maxAgeMs?: number },
): CsrfCheck {
  if (!headerToken || !cookieToken) return { ok: false, reason: "missing" };
  if (!safeEqual(headerToken, cookieToken)) return { ok: false, reason: "mismatch" };
  if (!TOKEN_PATTERN.test(headerToken)) return { ok: false, reason: "malformed" };
  const [issued, random, mac] = headerToken.split(".") as [string, string, string];
  if (!safeEqual(mac, sign(secret, `${issued}.${random}`)))
    return { ok: false, reason: "signature" };
  const issuedAt = Number.parseInt(issued, 36);
  const now = options.now ?? Date.now();
  const age = now - issuedAt;
  const maxAge = options.maxAgeMs ?? CSRF_MAX_AGE_SECONDS * 1000;
  if (!Number.isFinite(issuedAt) || age < 0 || age > maxAge)
    return { ok: false, reason: "expired" };
  if (age < options.minAgeMs) return { ok: false, reason: "too_fast" };
  return { ok: true, issuedAt };
}
