import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;

/**
 * End-to-end tests against the PRODUCTION build (`npm run build` first).
 * CAPTCHA is disabled and email is logged instead of sent, only for this test server.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SITE_URL: BASE,
      CAPTCHA_PROVIDER: "none",
      ENQUIRY_DELIVERY: "log",
      CLIENT_IP_HEADER: "x-forwarded-for",
      MIN_FILL_SECONDS: "1",
      RATE_LIMIT_PER_IP: "5",
      RATE_LIMIT_GLOBAL_PER_HOUR: "500",
    },
  },
});
