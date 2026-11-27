import { expect, test, type APIRequestContext } from "@playwright/test";
import { failOnDialogs, skipIntro } from "./helpers";

const valid = {
  firstName: "Asha",
  lastName: "Rao",
  email: "asha@example.com",
  service: "Other",
  message: "Testing the enquiry endpoint from e2e.",
  website: "",
  captchaToken: "",
};

let ipCounter = 10;
const nextIp = () => `198.18.0.${ipCounter++}`;

async function session(
  request: APIRequestContext,
  ip: string,
): Promise<{ token: string; cookie: string }> {
  const res = await request.get("/api/enquiry", { headers: { "x-forwarded-for": ip } });
  expect(res.status()).toBe(200);
  const { token } = (await res.json()) as { token: string };
  return { token, cookie: `__Host-tz-enquiry=${token}` };
}

test.describe("security", () => {
  test.skip(({ isMobile }) => isMobile, "API checks run once");

  test("security headers are set", async ({ request, baseURL }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toMatch(
      /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
    );
    expect(h["content-security-policy"]).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["strict-transport-security"]).toContain("preload");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["cross-origin-opener-policy"]).toBe("same-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
    const api = await request.get("/api/enquiry");
    expect(api.headers()["content-security-policy"]).toContain("default-src 'none'");
    expect(baseURL).toBeTruthy();
  });

  test("a new nonce on every request", async ({ request }) => {
    const a = (await request.get("/")).headers()["content-security-policy"];
    const b = (await request.get("/")).headers()["content-security-policy"];
    expect(a).not.toBe(b);
  });

  test("POST without a CSRF token is refused", async ({ request, baseURL }) => {
    const res = await request.post("/api/enquiry", {
      data: valid,
      headers: { origin: baseURL!, "x-forwarded-for": nextIp() },
    });
    expect(res.status()).toBe(403);
  });

  test("cross-origin POST is refused even with a valid token", async ({ request }) => {
    const ip = nextIp();
    const { token, cookie } = await session(request, ip);
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request.post("/api/enquiry", {
      data: valid,
      headers: {
        origin: "https://evil.example",
        "x-csrf-token": token,
        cookie,
        "x-forwarded-for": ip,
      },
    });
    expect(res.status()).toBe(403);
  });

  test("oversized payloads are refused", async ({ request, baseURL }) => {
    const ip = nextIp();
    const { token, cookie } = await session(request, ip);
    const res = await request.post("/api/enquiry", {
      data: { ...valid, message: "x".repeat(50_000) },
      headers: { origin: baseURL!, "x-csrf-token": token, cookie, "x-forwarded-for": ip },
    });
    expect(res.status()).toBe(413);
  });

  test("rapid-fire submissions are rate limited", async ({ request, baseURL }) => {
    const ip = nextIp();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const { token, cookie } = await session(request, ip);
      await new Promise((r) => setTimeout(r, 1050));
      const res = await request.post("/api/enquiry", {
        data: valid,
        headers: { origin: baseURL!, "x-csrf-token": token, cookie, "x-forwarded-for": ip },
      });
      statuses.push(res.status());
    }
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  test("errors are generic and never leak internals", async ({ request, baseURL }) => {
    const ip = nextIp();
    const { token, cookie } = await session(request, ip);
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request.post("/api/enquiry", {
      data: "{broken json",
      headers: {
        origin: baseURL!,
        "x-csrf-token": token,
        cookie,
        "x-forwarded-for": ip,
        "content-type": "application/json",
      },
    });
    expect(res.status()).toBe(400);
    const text = await res.text();
    expect(text).not.toMatch(/SyntaxError|at .*\(|node_modules|\/home\/|next\.js|version/i);
  });

  test("other HTTP methods are refused", async ({ request }) => {
    for (const method of ["PUT", "DELETE", "PATCH"]) {
      const res = await request.fetch("/api/enquiry", { method });
      expect(res.status()).toBe(405);
    }
  });

  test("path traversal cannot reach files outside public/", async ({ request }) => {
    const paths = [
      "/video/..%2f..%2fpackage.json",
      "/video/%2e%2e/%2e%2e/.env.local",
      "/members/..%2F..%2F.env.local",
      "/members/....//....//package.json",
      "/generated/../../next.config.ts",
      "/video/web/..%5c..%5cpackage.json",
      "/.env.local",
      "/.git/config",
    ];
    for (const p of paths) {
      const res = await request.get(p);
      const body = await res.text();
      expect(body, p).not.toContain('"name": "services-tekraze"');
      expect(body, p).not.toMatch(/CAPTCHA_PROVIDER|SMTP_|\[core\]/);
    }
    const img = await request.get("/_next/image?url=%2F..%2F..%2Fetc%2Fpasswd&w=640&q=75");
    expect(img.status()).toBeGreaterThanOrEqual(400);
    const remote = await request.get(
      "/_next/image?url=https%3A%2F%2Fevil.example%2Fx.png&w=640&q=75",
    );
    expect(remote.status()).toBeGreaterThanOrEqual(400);
  });

  test("media is served with correct types and locked down", async ({ request }) => {
    const res = await request.get("/video/web/hero-poster.webp");
    if (res.status() === 200) {
      expect(res.headers()["content-type"]).toBe("image/webp");
      expect(res.headers()["x-content-type-options"]).toBe("nosniff");
      expect(res.headers()["content-security-policy"]).toContain("sandbox");
    }
    const dir = await request.get("/video/");
    expect(dir.status()).toBe(404);
  });

  test("open redirects are not possible via ?service or ?q", async ({ page, baseURL }) => {
    failOnDialogs(page);
    await skipIntro(page);
    await page.goto("/?service=https://evil.example&q=javascript:alert(1)");
    await page.waitForTimeout(800);
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
    await expect(page.getByRole("dialog", { name: /evil/ })).toHaveCount(0);
  });

  test("XSS payloads in search render as text", async ({ page }) => {
    failOnDialogs(page);
    await skipIntro(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Search services" }).click();
    for (const payload of [
      "<img src=x onerror=alert(1)>",
      '"><svg onload=alert(1)>',
      "javascript:alert(1)",
      "{{constructor.constructor('alert(1)')()}}",
    ]) {
      await page.getByRole("combobox", { name: /Search services/ }).fill(payload);
      await page.waitForTimeout(250);
      await expect(page.locator("#search-dialog img, #search-dialog svg[onload]")).toHaveCount(0);
    }
  });
});
