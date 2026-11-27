import { expect, test } from "@playwright/test";
import { failOnDialogs, gotoQuote, skipIntro } from "./helpers";

test.describe("main flows", () => {
  test("intro → profile pick → browse", async ({ page }) => {
    failOnDialogs(page);
    await page.goto("/");
    const boot = page.locator(".boot-screen");
    await expect(boot).toBeVisible();
    await boot.getByRole("button", { name: "Skip intro" }).click();
    const gate = page.getByRole("dialog", { name: "Who’s watching?" });
    await expect(gate).toBeVisible();
    await gate.getByRole("button", { name: "Continue as Balwinder Singh" }).click();
    await expect(gate).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Five ways we help you grow.");
    expect(await page.evaluate(() => sessionStorage.getItem("tz-profile"))).toBe("balwinder-singh");
    // the choice is remembered for the session: reload shows no intro or gate
    await page.reload();
    await expect(page.locator(".boot-screen")).toBeHidden();
    await expect(page.locator(".profile-gate")).toBeHidden();
  });

  test("skip on the profile screen", async ({ page }) => {
    await page.addInitScript(() => window.sessionStorage.setItem("tz-boot", "1"));
    await page.goto("/");
    await page.getByRole("button", { name: "Skip, just browse" }).click();
    await expect(page.locator(".profile-gate")).toBeHidden();
  });

  test("open a title card from a row, close with Esc, focus returns", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/");
    const card = page.locator("#row-brand").getByRole("button", { name: /Graphic design/ });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    if ((await card.getAttribute("aria-expanded")) === "true") await card.click(); // touch: tap again
    const dialog = page.getByRole("dialog", { name: "Graphic design" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("What’s included")).toBeVisible();
    await expect(page).toHaveURL(/\?service=graphic-design/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(card).toBeFocused();
  });

  test("title card → quote pre-fills the service", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/?service=crypto-analysis");
    const dialog = page.getByRole("dialog", { name: "Crypto analysis" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Informational only, not financial advice.")).toBeVisible();
    await dialog.getByRole("button", { name: "Get a quote for this service" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel("Service", { exact: true })).toHaveValue("Crypto analysis");
  });

  test("search: type, arrow, enter opens the result", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Search services" }).click();
    const input = page.getByRole("combobox", { name: /Search services/ });
    await input.fill("seo");
    await expect(
      page
        .getByRole("listbox", { name: "Search results" })
        .getByRole("option", { name: /Blog writing & SEO/ }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\?q=seo/);
    await input.press("Enter");
    await expect(page.getByRole("dialog", { name: "Blog writing & SEO" })).toBeVisible();
  });

  test("search shows a friendly empty state", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/?q=zzzzqqq");
    await expect(page.getByText("Nothing on this channel.")).toBeVisible();
  });

  test("enquiry form: invalid data shows field errors", async ({ page }) => {
    await skipIntro(page);
    await gotoQuote(page);
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText("Enter your first name.")).toBeVisible();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Choose a service from the list.")).toBeVisible();
    await expect(page.getByLabel("First name")).toBeFocused();
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(
      page.getByText("Enter a valid email address, like name@example.com."),
    ).toBeVisible();
  });

  test("enquiry form: valid data is sent", async ({ page }) => {
    failOnDialogs(page);
    await skipIntro(page);
    await gotoQuote(page);
    await page.getByLabel("First name").fill("Asha");
    await page.getByLabel("Last name").fill("Rao");
    await page.getByLabel("Email").fill("asha@example.com");
    await page.getByLabel("Service", { exact: true }).selectOption("Growth Bundle");
    await page
      .getByLabel("Message")
      .fill('Relaunch in March. <script>alert(1)</script> "><img src=x onerror=alert(2)>');
    await page.waitForTimeout(1200); // minimum fill time
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText("Enquiry sent.")).toBeVisible();
  });
});

test.describe("resilience", () => {
  test("all service text is in the HTML without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Five ways we help you grow.");
    for (const text of [
      "Graphic design",
      "Crypto analysis",
      "Informational only, not financial advice.",
      "The Growth Bundle",
      "How much does it cost?",
      "Deliver",
    ]) {
      await expect(page.getByText(text).first()).toBeAttached();
    }
    await expect(page.locator(".boot-screen")).toBeHidden();
    await expect(page.locator(".profile-gate")).toBeHidden();
    await context.close();
  });

  test("reduced motion: no smooth scroll, no pinned trailer, content readable", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.addInitScript(() => {
      sessionStorage.setItem("tz-boot", "1");
      sessionStorage.setItem("tz-profile", "guest");
    });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/motion-ok/);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await expect(page.getByRole("heading", { name: "Research & Analysis" }).first()).toBeVisible();
    await context.close();
  });

  test("keyboard: first Tab reaches the skip link", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard test is desktop only");
    await skipIntro(page);
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});
