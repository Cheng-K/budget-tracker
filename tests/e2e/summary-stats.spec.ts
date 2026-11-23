import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Net-hero summary card on Home and Reports. Amounts are seeded through
 * the UI at a narrow mobile viewport, where the old three-box layout
 * truncated (home) or overflowed (reports) large values.
 */

test.use({ viewport: { width: 360, height: 800 } });

async function addTransaction(
  page: Page,
  opts: { type: "INCOME" | "EXPENSE"; category: string; digits: string }
) {
  await page.goto("/");
  await page.getByRole("link", { name: "Add transaction" }).click();
  await expect(page).toHaveURL(/\/transactions\/new/);
  if (opts.type === "INCOME") {
    await page.getByRole("button", { name: "Income", exact: true }).click();
  }
  await page.locator("#amount-amount").click();
  await page.keyboard.type(opts.digits); // digits-first input: 123456789 → 1,234,567.89
  await page.locator("#categoryId").selectOption({ label: opts.category });
  await page.locator("#paymentMethodId").selectOption({ label: "Cash" });
  await page.getByRole("button", { name: "Add transaction" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
}

function summaryCard(page: Page) {
  return page
    .locator("div.rounded-xl")
    .filter({ has: page.getByText("Net", { exact: true }) });
}

async function expectInsideCard(page: Page, text: string) {
  const amount = summaryCard(page).getByText(text, { exact: true });
  await expect(amount).toBeVisible();
  const overflows = await amount.evaluate((el) => {
    const card = el.closest(".rounded-xl");
    if (!card) return true;
    const a = el.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    return a.right > c.right + 0.5 || a.left < c.left - 0.5;
  });
  expect(overflows).toBe(false);
}

test.describe("summary stats", () => {
  test("large amounts render in full on home and reports", async ({ page }) => {
    await login(page, { currency: "USD" });
    await addTransaction(page, { type: "INCOME", category: "Salary", digits: "123456789" });
    await addTransaction(page, { type: "EXPENSE", category: "Rent & Housing", digits: "98765432" });

    for (const path of ["/", "/reports"]) {
      await page.goto(path);
      await expectInsideCard(page, "$1,234,567.89");
      await expectInsideCard(page, "$987,654.32");
      await expectInsideCard(page, "$246,913.57");
      await expect(summaryCard(page).getByText("$246,913.57", { exact: true })).toHaveClass(
        /text-emerald-600/
      );
    }
  });

  test("negative net renders in red on home and reports", async ({ page }) => {
    await login(page, { currency: "USD" });
    await addTransaction(page, { type: "INCOME", category: "Salary", digits: "123456789" });
    await addTransaction(page, { type: "EXPENSE", category: "Rent & Housing", digits: "98765432" });
    await addTransaction(page, { type: "EXPENSE", category: "Shopping", digits: "30000000" });

    for (const path of ["/", "/reports"]) {
      await page.goto(path);
      await expectInsideCard(page, "-$53,086.43");
      await expect(summaryCard(page).getByText("-$53,086.43", { exact: true })).toHaveClass(
        /text-red-600/
      );
    }
  });
});
