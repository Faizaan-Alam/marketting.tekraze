import { describe, expect, it } from "vitest";
import { issueCsrfToken, verifyCsrfToken } from "@/lib/server/csrf";
import { SlidingWindowLimiter } from "@/lib/server/rate-limit";
import { buildCsp } from "@/lib/csp";

const SECRET = "s".repeat(64);

describe("CSRF tokens", () => {
  const t0 = 1_800_000_000_000;
  it("verifies a fresh token after the minimum fill time", () => {
    const tok = issueCsrfToken(SECRET, t0);
    expect(verifyCsrfToken(SECRET, tok, tok, { now: t0 + 5000, minAgeMs: 3000 })).toMatchObject({
      ok: true,
    });
  });
  it("rejects submissions that are too fast (time-to-submit check)", () => {
    const tok = issueCsrfToken(SECRET, t0);
    expect(verifyCsrfToken(SECRET, tok, tok, { now: t0 + 500, minAgeMs: 3000 })).toEqual({
      ok: false,
      reason: "too_fast",
    });
  });
  it("rejects missing, mismatched, tampered, foreign and expired tokens", () => {
    const tok = issueCsrfToken(SECRET, t0);
    const opts = { now: t0 + 5000, minAgeMs: 3000 };
    expect(verifyCsrfToken(SECRET, null, tok, opts).ok).toBe(false);
    expect(verifyCsrfToken(SECRET, tok, issueCsrfToken(SECRET, t0), opts)).toEqual({
      ok: false,
      reason: "mismatch",
    });
    const tampered = tok.slice(0, -1) + (tok.endsWith("0") ? "1" : "0");
    expect(verifyCsrfToken(SECRET, tampered, tampered, opts)).toEqual({
      ok: false,
      reason: "signature",
    });
    const foreign = issueCsrfToken("x".repeat(64), t0);
    expect(verifyCsrfToken(SECRET, foreign, foreign, opts)).toEqual({
      ok: false,
      reason: "signature",
    });
    expect(verifyCsrfToken(SECRET, tok, tok, { now: t0 + 3 * 3600_000, minAgeMs: 0 })).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(verifyCsrfToken(SECRET, "garbage", "garbage", opts)).toEqual({
      ok: false,
      reason: "malformed",
    });
  });
});

describe("SlidingWindowLimiter", () => {
  it("allows up to the limit, then blocks until the window passes", () => {
    const l = new SlidingWindowLimiter(3, 1000);
    expect([0, 1, 2].map((t) => l.take("ip", t).allowed)).toEqual([true, true, true]);
    const blocked = l.take("ip", 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(l.take("other", 10).allowed).toBe(true);
    expect(l.take("ip", 1001).allowed).toBe(true);
  });
  it("caps memory: never tracks more than maxKeys", () => {
    const l = new SlidingWindowLimiter(1, 60_000, 100);
    for (let i = 0; i < 5000; i += 1) l.take(`k${i}`, i);
    expect(l.size()).toBeLessThanOrEqual(100);
  });
});

describe("Content-Security-Policy", () => {
  const nonce = "abcdefghijklmnopqrstuv==";
  it("production policy has no unsafe-inline/unsafe-eval for scripts", () => {
    const csp = buildCsp({ nonce, isDev: false, frameOrigins: [] });
    const script = csp.split("; ").find((d) => d.startsWith("script-src")) ?? "";
    expect(script).toContain(`'nonce-${nonce}'`);
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("unsafe-inline");
    expect(script).not.toContain("unsafe-eval");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
  });
  it("only adds well-formed https origins to frame-src", () => {
    const csp = buildCsp({
      nonce,
      isDev: false,
      frameOrigins: [
        "https://app.example.com",
        "javascript:alert(1)",
        "http://insecure.com",
        "https://a.com; script-src *",
      ],
    });
    const frame = csp.split("; ").find((d) => d.startsWith("frame-src")) ?? "";
    expect(frame).toBe("frame-src https://challenges.cloudflare.com https://app.example.com");
  });
  it("rejects malformed nonces", () => {
    expect(() => buildCsp({ nonce: "x'; script-src *", isDev: false, frameOrigins: [] })).toThrow();
  });
});
