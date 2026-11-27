import "server-only";

/**
 * Cloudflare Turnstile verification. The endpoint is a fixed constant (no SSRF surface); the
 * token is size-limited by the schema before it gets here, and the call times out.
 */
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type CaptchaResult = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(
  token: string,
  secret: string | undefined,
  remoteIp: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<CaptchaResult> {
  if (!secret) return { ok: false, reason: "not_configured" };
  if (!token) return { ok: false, reason: "missing_token" };
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const res = await fetchImpl(SITEVERIFY, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const data: unknown = await res.json();
    if (
      typeof data === "object" &&
      data !== null &&
      (data as { success?: unknown }).success === true
    ) {
      return { ok: true };
    }
    return { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
