import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Header back navigation on sub-screens at mobile width. Back targets are
 * fixed parents (not history), so they must work after direct gotos too.
 */

test.use({ viewport: { width: 360, height: 800 } });

async function addTransaction(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Add transaction" }).click();
  await expect(page).toHaveURL(/\/transactions\/new/);
  await page.locator("#amount-amount").click();
  await page.keyboard.type("1000"); // digits-first input: 1000 → $10.00
  await page.locator("#categoryId").selectOption({ label: "Shopping" });
  await page.locator("#paymentMethodId").selectOption({ label: "Cash" });
  await page.getByRole("button", { name: "Add transaction" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
}

function back(page: Page) {
  // exact: "Share feedback" would otherwise substring-match "Back".
  return page.getByRole("link", { name: "Back", exact: true });
}

test.describe("back navigation", () => {
  test("add screen shows header title and backs to the list", async ({ page }) => {
    await login(page, { currency: "USD" });
    await page.goto("/");
    await page.getByRole("link", { name: "Add transaction" }).click();
    await expect(page.getByRole("heading", { name: "Add transaction" })).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await back(page).click();
    await expect(page).toHaveURL(/\/transactions$/);
  });

  test("detail backs to the list, edit backs to detail", async ({ page }) => {
    await login(page, { currency: "USD" });
    await addTransaction(page);

    await page.locator('main a[href^="/transactions/"]').first().click();
    await expect(page).toHaveURL(/\/transactions\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Shopping" })).toBeVisible();
    await back(page).click();
    await expect(page).toHaveURL(/\/transactions$/);

    await page.locator('main a[href^="/transactions/"]').first().click();
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/transactions\/[^/]+\/edit$/);
    await expect(page.getByRole("heading", { name: "Edit transaction" })).toBeVisible();
    await back(page).click();
    await expect(page).toHaveURL(/\/transactions\/[^/]+$/);
  });

  test("deep-linked detail backs to the list without history", async ({ page }) => {
    await login(page, { currency: "USD" });
    await addTransaction(page);
    const href = await page
      .locator('main a[href^="/transactions/"]')
      .first()
      .getAttribute("href");
    await page.goto(href!);
    await back(page).click();
    await expect(page).toHaveURL(/\/transactions$/);
  });

  test("settings and recurring back to home", async ({ page }) => {
    await login(page, { currency: "USD" });
    for (const path of ["/settings", "/recurring"]) {
      await page.goto(path);
      await back(page).click();
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test("tab roots keep the logo and no back button", async ({ page }) => {
    await login(page, { currency: "USD" });
    for (const path of ["/", "/transactions", "/budgets", "/reports"]) {
      await page.goto(path);
      await expect(page.getByRole("link", { name: "Budget Tracker" })).toBeVisible();
      await expect(back(page)).toHaveCount(0);
    }
  });
});
