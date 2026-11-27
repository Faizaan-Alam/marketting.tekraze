import "server-only";
import { createHmac } from "node:crypto";

/**
 * Security event log: one JSON line per event on stdout. No personal data: IPs are stored as a
 * keyed hash (stable within a deployment, not reversible), emails are never logged in full and
 * message bodies are never logged.
 */

export type SecurityEvent =
  | "enquiry_accepted"
  | "enquiry_invalid"
  | "honeypot"
  | "csrf_failed"
  | "origin_rejected"
  | "rate_limited"
  | "global_limited"
  | "captcha_failed"
  | "body_too_large"
  | "bad_content_type"
  | "delivery_failed"
  | "config_error"
  | "token_issued";

export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 16);
}

export function logSecurityEvent(
  event: SecurityEvent,
  detail: Record<string, string | number | boolean> = {},
): void {
  if (process.env.NODE_ENV === "test" && process.env.LOG_IN_TESTS !== "true") return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    scope: "security",
    event,
    ...detail,
  });
  if (event === "enquiry_accepted" || event === "token_issued") console.info(line);
  else console.warn(line);
}
