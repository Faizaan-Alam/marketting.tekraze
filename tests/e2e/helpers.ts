import { expect, type Page } from "@playwright/test";

/** Skip the intro for tests that are about other features. */
export async function skipIntro(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("tz-boot", "1");
  });
}

/** Fail the test if any JavaScript dialog (alert/confirm/prompt) opens — an XSS tripwire. */
export function failOnDialogs(page: Page): void {
  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
    throw new Error(`Unexpected dialog: ${dialog.message()}`);
  });
}

export async function gotoQuote(page: Page): Promise<void> {
  // the form fetches its CSRF token when it nears the viewport — listen before navigating
  const token = page.waitForResponse(
    (r) => r.url().endsWith("/api/enquiry") && r.request().method() === "GET",
  );
  await page.goto("/#quote");
  await page.locator("#quote form").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Get a free quote", level: 2 })).toBeVisible();
  await token;
}
