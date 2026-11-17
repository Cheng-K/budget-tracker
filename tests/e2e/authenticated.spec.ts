import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Authenticated UI flows. Each test signs in via the test-only
 * /api/auth/e2e-login endpoint (a real database session — see the route
 * for its guard conditions).
 */

test.describe("authenticated golden path", () => {
  test("dashboard renders after login", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL("/");
    await expect(page.locator("h1").first()).toHaveText(/\w+ \d{4}/);
    await expect(page.getByText("Budget progress")).toBeVisible();
    await expect(page.getByText("Recent transactions")).toBeVisible();
    await expect(page.getByText("No transactions yet.")).toBeVisible();
  });

  test("create a transaction through the UI", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Add transaction" }).click();
    await expect(page).toHaveURL(/\/transactions\/new/);

    await page.locator("#amount-amount").click();
    await page.keyboard.type("1250"); // digits-first input: 1250 → 12.50
    await expect(page.locator("#amount-amount")).toHaveValue("12.50");

    await page.locator("#categoryId").selectOption({ label: "Groceries" });
    await page.locator("#paymentMethodId").selectOption({ label: "Cash" });
    const note = `e2e note ${Date.now()}`;
    await page.locator("#note").fill(note);

    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.getByText(note)).toBeVisible();
  });

  test("set a budget", async ({ page }) => {
    await login(page);
    await page.goto("/budgets");
    await expect(page.getByText("Set a budget")).toBeVisible();

    await page.getByRole("button", { name: "+ Food & Dining" }).click();
    await expect(page.getByText("Monthly budget for")).toBeVisible();

    await page.locator("#amount-budget-limit").click();
    await page.keyboard.type("5000"); // → 50.00
    await page.getByRole("button", { name: "Set budget" }).click();

    await expect(page.getByText("0% used")).toBeVisible();
    await expect(page.getByText("50.00")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Food & Dining" })).toBeHidden();
  });

  test("onboarding: pick currency on first login", async ({ page }) => {
    await login(page, { onboarding: true });
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText("Choose your currency")).toBeVisible();

    await page.locator('label:has(input[value="USD"])').click();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Budget progress")).toBeVisible();
  });

  test("sign out returns to login", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Continue with Google")).toBeVisible();
  });
});
