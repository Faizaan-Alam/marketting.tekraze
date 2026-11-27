/**
 * Content-Security-Policy builder. Scripts are allowed only with the per-request nonce
 * ('strict-dynamic' lets those trusted scripts load their own chunks). No 'unsafe-inline' or
 * 'unsafe-eval' for scripts in production. Styles allow 'unsafe-inline' because React/Framer
 * Motion write inline style attributes; with no HTML injection points this is low risk.
 */

export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export type CspOptions = {
  nonce: string;
  isDev: boolean;
  /** Origins of web-app previews (from webapps/ meta.json liveUrl), allowed in frame-src. */
  frameOrigins: ReadonlyArray<string>;
  /** Optional privacy-friendly analytics origin (e.g. https://plausible.io). */
  analyticsOrigin?: string | null;
};

const ORIGIN = /^https:\/\/[a-z0-9.-]+(:\d{1,5})?$/i;

export function buildCsp({ nonce, isDev, frameOrigins, analyticsOrigin }: CspOptions): string {
  if (!/^[A-Za-z0-9+/=_-]{16,128}$/.test(nonce)) throw new Error("invalid nonce");
  const frames = frameOrigins.filter((o) => ORIGIN.test(o));
  const analytics = analyticsOrigin && ORIGIN.test(analyticsOrigin) ? [analyticsOrigin] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      TURNSTILE_ORIGIN,
      ...analytics,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "media-src": ["'self'", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", TURNSTILE_ORIGIN, ...analytics, ...(isDev ? ["ws:", "wss:"] : [])],
    "frame-src": [TURNSTILE_ORIGIN, ...frames],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}
