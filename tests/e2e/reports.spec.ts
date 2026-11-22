import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Reports "Spending by category" donut chart. Transactions are created
 * through the UI (server actions — no public write API), mirroring the
 * flows in authenticated.spec.ts.
 */

async function addExpense(page: Page, category: string, digits: string) {
  await page.getByRole("link", { name: "Add transaction" }).click();
  await expect(page).toHaveURL(/\/transactions\/new/);
  await page.locator("#amount-amount").click();
  await page.keyboard.type(digits); // digits-first input: 6000 → 60.00
  await page.locator("#categoryId").selectOption({ label: category });
  await page.locator("#paymentMethodId").selectOption({ label: "Cash" });
  await page.getByRole("button", { name: "Add transaction" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
}

test.describe("reports spending by category", () => {
  test("empty month shows the no-expenses state", async ({ page }) => {
    await login(page, { currency: "USD" });
    await page.goto("/reports");
    await expect(page.getByText("No expenses this month.")).toBeVisible();
  });

  test("legend selection shows detail, budget warning and transactions link", async ({ page }) => {
    await login(page, { currency: "USD" });

    // Budget 50.00 for Groceries, then spend 60.00 → over by 10.00.
    await page.goto("/budgets");
    await page.getByRole("button", { name: "+ Groceries" }).click();
    await page.locator("#amount-budget-limit").click();
    await page.keyboard.type("5000");
    await page.getByRole("button", { name: "Set budget" }).click();
    await expect(page.getByText("0% used")).toBeVisible();

    await page.goto("/");
    await addExpense(page, "Groceries", "6000");

    await page.goto("/reports");
    const legendRow = page.getByRole("button", { name: /Groceries/ });
    await expect(legendRow).toBeVisible();
    await expect(page.getByText("Total spent")).toBeVisible();
    await expect(page.getByText("$60.00").first()).toBeVisible();

    await legendRow.click();
    await expect(legendRow).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("100% of spending · 1 transaction")).toBeVisible();
    await expect(page.getByText("Budget: $50.00")).toBeVisible();
    await expect(page.getByText("(over by $10.00)")).toBeVisible();

    await page.getByRole("link", { name: "View transactions" }).click();
    await expect(page).toHaveURL(/\/transactions\?month=\d{4}-\d{2}&categoryId=.+&type=EXPENSE/);
    await expect(page.getByText("Showing 1 transactions")).toBeVisible();
  });

  test("categories beyond the top 7 are grouped into Other", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, { currency: "USD" });

    const categories = [
      "Food & Dining",
      "Groceries",
      "Rent & Housing",
      "Transport",
      "Utilities",
      "Entertainment",
      "Health",
      "Shopping",
    ];
    await page.goto("/");
    for (let i = 0; i < categories.length; i++) {
      // Descending amounts: 80.00, 70.00, … 10.00 → Shopping lands in Other.
      await addExpense(page, categories[i], String((8 - i) * 1000));
    }

    await page.goto("/reports");
    await expect(page.getByRole("button", { name: /Food & Dining/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Other/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Shopping/ })).toHaveCount(0);

    await page.getByRole("button", { name: /^Other/ }).click();
    await expect(page.getByText("Other categories")).toBeVisible();
    const shoppingLink = page.getByRole("link", { name: "Shopping" });
    await expect(shoppingLink).toBeVisible();
    await expect(page.getByText("$10.00").first()).toBeVisible();

    await shoppingLink.click();
    await expect(page).toHaveURL(/\/transactions\?month=\d{4}-\d{2}&categoryId=.+&type=EXPENSE/);
    await expect(page.getByText("Showing 1 transactions")).toBeVisible();
  });
});
