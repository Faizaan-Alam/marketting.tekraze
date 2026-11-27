/**
 * URL allow-listing. Every URL that ends up in an href, src or iframe must pass through here.
 * Only absolute https: URLs without credentials, to public hostnames, are accepted.
 */

const PRIVATE_HOST_PATTERNS: ReadonlyArray<(host: string) => boolean> = [
  (h) => h === "localhost" || h.endsWith(".localhost"),
  (h) => h.endsWith(".local") || h.endsWith(".internal"),
  // IPv4 literals: we never link to raw IPs from content files
  (h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h),
  // IPv6 literals are wrapped in brackets by URL
  (h) => h.startsWith("["),
];

export function parseSafeHttpsUrl(input: string): URL | null {
  if (typeof input !== "string" || input.length === 0 || input.length > 2048) return null;
  // reject control characters and whitespace anywhere (blocks "java\tscript:" style tricks)
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return null;
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  const host = url.hostname.toLowerCase();
  if (host.length === 0 || !host.includes(".")) return null;
  if (PRIVATE_HOST_PATTERNS.some((test) => test(host))) return null;
  return url;
}

export function isSafeHttpsUrl(input: string): boolean {
  return parseSafeHttpsUrl(input) !== null;
}

/** Same as isSafeHttpsUrl, but also requires the hostname to be on an explicit allow-list. */
export function isAllowedHostUrl(input: string, allowedHosts: ReadonlyArray<string>): boolean {
  const url = parseSafeHttpsUrl(input);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** Origin (scheme://host[:port]) of a safe https URL, for use in CSP frame-src. */
export function safeOrigin(input: string): string | null {
  const url = parseSafeHttpsUrl(input);
  return url ? url.origin : null;
}

/** In-page anchors are the only relative links we render. */
export function isSafeAnchor(input: string): boolean {
  return /^#[a-z0-9-]{1,64}$/.test(input);
}
