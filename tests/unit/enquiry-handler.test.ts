import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEnquiryHandlers } from "@/lib/server/enquiry-handler";
import { buildEnquiryEmail } from "@/lib/server/mailer";
import type { ServerEnv } from "@/lib/server/env";
import type { Enquiry } from "@/lib/enquiry-schema";
import type { CaptchaResult } from "@/lib/server/captcha";
import type { Mock } from "vitest";
import { SQLI, XSS } from "./payloads";

const ORIGIN = "https://services.tekraze.com";

function env(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    NODE_ENV: "production",
    SITE_URL: ORIGIN,
    ALLOWED_ORIGINS: "",
    CSRF_SECRET: "c".repeat(64),
    CLIENT_IP_HEADER: "x-real-ip",
    CAPTCHA_PROVIDER: "turnstile",
    TURNSTILE_SECRET_KEY: "secret",
    ENQUIRY_DELIVERY: "smtp",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: "u",
    SMTP_PASS: "p",
    MAIL_FROM: "from@example.com",
    MAIL_TO: "to@example.com",
    RATE_LIMIT_PER_IP: 3,
    RATE_LIMIT_WINDOW_MINUTES: 10,
    RATE_LIMIT_GLOBAL_PER_HOUR: 50,
    MIN_FILL_SECONDS: 3,
    csrfSecret: "c".repeat(64),
    allowedOrigins: [ORIGIN],
    ...overrides,
  };
}

const body = {
  firstName: "Asha",
  lastName: "Rao",
  email: "asha@example.com",
  service: "Marketing website",
  message: "We need a fast marketing site for our launch.",
  website: "",
  captchaToken: "tok",
};

describe("enquiry endpoint", () => {
  let now = 1_800_000_000_000;
  let deliver: Mock<(env: ServerEnv, enquiry: Enquiry) => Promise<void>>;
  let captcha: Mock<(token: string, ip: string | null) => Promise<CaptchaResult>>;
  let h: ReturnType<typeof createEnquiryHandlers>;
  let e: ServerEnv;

  beforeEach(() => {
    now = 1_800_000_000_000;
    e = env();
    deliver = vi.fn(async () => undefined);
    captcha = vi.fn(async (): Promise<CaptchaResult> => ({ ok: true }));
    h = createEnquiryHandlers({ env: () => e, deliver, verifyCaptcha: captcha, now: () => now });
  });

  async function token(ip = "203.0.113.1"): Promise<string> {
    const res = await h.GET(new Request(`${ORIGIN}/api/enquiry`, { headers: { "x-real-ip": ip } }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^__Host-tz-enquiry=/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    return ((await res.json()) as { token: string }).token;
  }

  function post(
    tok: string | null,
    opts: { body?: unknown; raw?: string; headers?: Record<string, string>; ip?: string } = {},
  ) {
    const raw = opts.raw ?? JSON.stringify(opts.body ?? body);
    return h.POST(
      new Request(`${ORIGIN}/api/enquiry`, {
        method: "POST",
        body: raw,
        headers: {
          "content-type": "application/json",
          origin: ORIGIN,
          "sec-fetch-site": "same-origin",
          "x-real-ip": opts.ip ?? "203.0.113.1",
          ...(tok ? { "x-csrf-token": tok, cookie: `__Host-tz-enquiry=${tok}` } : {}),
          ...opts.headers,
        },
      }),
    );
  }

  it("accepts a valid enquiry", async () => {
    const tok = await token();
    now += 5000;
    const res = await post(tok);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(deliver).toHaveBeenCalledOnce();
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("tokens are single-use: replaying an accepted token is refused", async () => {
    const tok = await token();
    now += 5000;
    expect((await post(tok)).status).toBe(200);
    expect((await post(tok)).status).toBe(403);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("rejects requests without a CSRF token", async () => {
    const res = await post(null);
    expect(res.status).toBe(403);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("rejects a header token that does not match the cookie", async () => {
    const tok = await token();
    now += 5000;
    const res = await post(tok, { headers: { cookie: "__Host-tz-enquiry=other" } });
    expect(res.status).toBe(403);
  });

  it("rejects submissions faster than the minimum fill time", async () => {
    const tok = await token();
    now += 500;
    const res = await post(tok);
    expect(res.status).toBe(400);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("rejects cross-origin posts (CSRF origin check)", async () => {
    const tok = await token();
    now += 5000;
    expect((await post(tok, { headers: { origin: "https://evil.example" } })).status).toBe(403);
    expect((await post(tok, { headers: { "sec-fetch-site": "cross-site" } })).status).toBe(403);
    expect((await post(tok, { headers: { origin: "null" } })).status).toBe(403);
  });

  it("rejects non-JSON content types", async () => {
    const tok = await token();
    now += 5000;
    expect(
      (await post(tok, { headers: { "content-type": "application/x-www-form-urlencoded" } }))
        .status,
    ).toBe(415);
  });

  it("rejects oversized bodies (declared and streamed)", async () => {
    const tok = await token();
    now += 5000;
    const big = JSON.stringify({ ...body, message: "x".repeat(40_000) });
    expect(
      (await post(tok, { raw: big, headers: { "content-length": String(big.length) } })).status,
    ).toBe(413);
    expect((await post(tok, { raw: big })).status).toBe(413);
  });

  it("rejects malformed JSON, arrays and unknown fields with a generic message", async () => {
    const raws = ["{not json", "[]", "null", JSON.stringify({ ...body, admin: true })];
    for (const [i, raw] of raws.entries()) {
      const ip = `203.0.113.${50 + i}`;
      const t = await token(ip);
      now += 5000;
      const res = await post(t, { raw, ip });
      expect([400, 422]).toContain(res.status);
      const text = await res.text();
      expect(text).not.toMatch(/at \w+ \(|node_modules|\/home\/|stack|zod/i);
    }
  });

  it.each([...XSS, ...SQLI.filter((p) => /[;=(){}$*"]/.test(p))])(
    "rejects hostile names: %s",
    async (payload) => {
      const tok = await token();
      now += 5000;
      const res = await post(tok, { body: { ...body, firstName: payload } });
      expect(res.status).toBe(422);
      expect(deliver).not.toHaveBeenCalled();
    },
  );

  it("silently drops honeypot submissions", async () => {
    const tok = await token();
    now += 5000;
    const res = await post(tok, { body: { ...body, website: "https://spam.example" } });
    expect(res.status).toBe(200);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("requires a valid CAPTCHA", async () => {
    captcha.mockResolvedValueOnce({ ok: false, reason: "rejected" });
    const tok = await token();
    now += 5000;
    const res = await post(tok);
    expect(res.status).toBe(400);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("rate-limits rapid-fire submissions per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const tok = await token("198.51.100.7");
      now += 5000;
      statuses.push((await post(tok, { ip: "198.51.100.7" })).status);
    }
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.slice(3)).toEqual([429, 429]);
    // another IP is unaffected
    const tok = await token("198.51.100.8");
    now += 5000;
    expect((await post(tok, { ip: "198.51.100.8" })).status).toBe(200);
  });

  it("enforces a global cap across all IPs", async () => {
    e = env({ RATE_LIMIT_GLOBAL_PER_HOUR: 2, RATE_LIMIT_PER_IP: 100 });
    h = createEnquiryHandlers({ env: () => e, deliver, verifyCaptcha: captcha, now: () => now });
    const results: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const ip = `192.0.2.${i + 1}`;
      const tok = await token(ip);
      now += 5000;
      results.push((await post(tok, { ip })).status);
    }
    expect(results).toEqual([200, 200, 429]);
  });

  it("returns a generic error if delivery fails, without leaking details", async () => {
    deliver.mockRejectedValueOnce(
      new Error("ECONNREFUSED 10.0.0.5:587 /srv/app/node_modules/nodemailer"),
    );
    const tok = await token();
    now += 5000;
    const res = await post(tok);
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|node_modules|nodemailer/);
  });

  it("fails closed with 'unavailable' when the Turnstile secret is missing", async () => {
    e = env({ TURNSTILE_SECRET_KEY: undefined });
    h = createEnquiryHandlers({ env: () => e, deliver, now: () => now });
    const tok = await token();
    now += 5000;
    expect((await post(tok)).status).toBe(503);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("fails closed when SMTP is not configured", async () => {
    e = env({ SMTP_HOST: undefined });
    const tok = await token();
    now += 5000;
    expect((await post(tok)).status).toBe(503);
  });

  it("ignores malformed client-IP headers (CRLF cannot even be sent)", async () => {
    expect(() => new Headers({ "x-real-ip": "1.2.3.4\r\nX-Evil: 1" })).toThrow();
    const tok = await token("not-an-ip;<script>");
    now += 5000;
    const res = await post(tok, { ip: "not-an-ip;<script>" });
    expect(res.status).toBe(200);
  });
});

describe("enquiry email", () => {
  it("keeps user input out of headers except CRLF-free subject / reply-to", () => {
    const enquiry: Enquiry = {
      firstName: "Asha",
      lastName: "Rao",
      email: "asha@example.com",
      service: "Other",
      message: "Line 1\r\nBcc: victim@example.com\n<script>alert(1)</script>",
      website: "",
      captchaToken: "",
    };
    const mail = buildEnquiryEmail(enquiry);
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.replyTo).toBe("asha@example.com");
    // the body is plain text; hostile text is carried as inert characters
    expect(mail.text).toContain("<script>alert(1)</script>");
  });
});
