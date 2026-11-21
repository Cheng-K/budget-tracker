import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { login } from "./helpers";

/**
 * High-severity user journeys beyond the golden path: receipts, edit/delete,
 * recurring materialization, cross-user isolation, over-budget display, and
 * CSV export. Each test gets a fresh isolated user via the e2e-login helper.
 */

// 1x1 transparent PNG — enough for the upload pipeline and S3 round-trip.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

interface CreateOpts {
  amountDigits: string; // cents-first, e.g. "1250" -> 12.50
  category: string;
  note: string;
  withReceipt?: boolean;
}

async function createTransactionViaUI(page: Page, opts: CreateOpts) {
  await page.getByRole("link", { name: "Add transaction" }).click();
  await expect(page).toHaveURL(/\/transactions\/new/);

  await page.locator("#amount-amount").click();
  await page.keyboard.type(opts.amountDigits);
  await page.locator("#categoryId").selectOption({ label: opts.category });
  await page.locator("#paymentMethodId").selectOption({ label: "Cash" });
  await page.locator("#note").fill(opts.note);

  if (opts.withReceipt) {
    await page.setInputFiles('input[type="file"]', {
      name: "receipt.png",
      mimeType: "image/png",
      buffer: PNG_1x1,
    });
    // Upload finished when the preview renders.
    await expect(page.getByRole("img", { name: "Receipt preview" })).toBeVisible();
  }

  await page.getByRole("button", { name: "Add transaction" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByText(opts.note)).toBeVisible();
}

async function openTransaction(page: Page, note: string) {
  await page.getByText(note).click();
  await expect(page).toHaveURL(/\/transactions\/[^/]+$/);
}

test.describe("receipts", () => {
  test("uploaded receipt is linked and served on the transaction detail", async ({ page }) => {
    await login(page);
    const note = `receipt e2e ${Date.now()}`;
    await createTransactionViaUI(page, {
      amountDigits: "1250",
      category: "Groceries",
      note,
      withReceipt: true,
    });

    await openTransaction(page, note);
    const img = page.getByRole("img", { name: "Receipt", exact: true });
    await expect(img).toBeVisible();
    // Prove the S3 round-trip: the image must actually load, not just exist.
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  });

  test("edit keeps the receipt; Remove unlinks it", async ({ page }) => {
    await login(page);
    const note = `receipt edit ${Date.now()}`;
    await createTransactionViaUI(page, {
      amountDigits: "1250",
      category: "Groceries",
      note,
      withReceipt: true,
    });
    await openTransaction(page, note);

    // Edit: existing receipt must be shown, and saving must keep it.
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.getByRole("img", { name: "Receipt preview" })).toBeVisible();
    const updatedNote = `${note} updated`;
    await page.locator("#note").fill(updatedNote);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/transactions\/[^/]+$/);
    await expect(page.getByText(updatedNote)).toBeVisible();
    await expect(page.getByRole("img", { name: "Receipt", exact: true })).toBeVisible();

    // Edit again and Remove: saving must unlink the receipt.
    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("img", { name: "Receipt preview" })).toHaveCount(0);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/transactions\/[^/]+$/);
    await expect(page.getByRole("img", { name: "Receipt", exact: true })).toHaveCount(0);
  });
});

test.describe("transaction lifecycle", () => {
  test("delete removes the transaction after confirmation", async ({ page }) => {
    await login(page);
    const note = `delete e2e ${Date.now()}`;
    await createTransactionViaUI(page, {
      amountDigits: "999",
      category: "Groceries",
      note,
    });
    await openTransaction(page, note);

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.getByText(note)).toHaveCount(0);
  });

  test("another user cannot open the transaction (404)", async ({ page }) => {
    await login(page);
    const note = `private e2e ${Date.now()}`;
    await createTransactionViaUI(page, {
      amountDigits: "500",
      category: "Groceries",
      note,
    });
    await openTransaction(page, note);
    const privateUrl = page.url();

    // Sign in as a different user and try the same URL. Assert on content,
    // not status: dev-mode streaming can flush 200 headers before notFound()
    // renders the 404 boundary.
    await login(page);
    await page.goto(privateUrl);
    await expect(
      page.getByRole("heading", { name: "This page could not be found." })
    ).toBeVisible();
    await expect(page.getByText(note)).toHaveCount(0);
  });
});

test.describe("recurring", () => {
  test("template materializes once and re-running creates no duplicates", async ({ page }) => {
    await login(page);
    await page.goto("/recurring");
    await page.getByRole("button", { name: "+ Add recurring transaction" }).click();

    await page.locator("#amount-amount").click();
    await page.keyboard.type("5000"); // 50.00
    await page.locator('select[name="categoryId"]').selectOption({ label: "Groceries" });
    await page.locator('select[name="paymentMethodId"]').selectOption({ label: "Cash" });
    const note = `recurring e2e ${Date.now()}`;
    await page.locator('input[name="note"]').fill(note);
    // startDate defaults to today (UTC), so exactly one occurrence is due.
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText(note)).toBeVisible();

    await page.getByRole("button", { name: "Run due now" }).click();
    await expect(page.getByRole("button", { name: "Run due now" })).toBeEnabled();

    await page.goto("/transactions");
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.getByText(/Showing 1 transactions/)).toBeVisible();

    // Second sweep must be a no-op.
    await page.goto("/recurring");
    await page.getByRole("button", { name: "Run due now" }).click();
    await expect(page.getByRole("button", { name: "Run due now" })).toBeEnabled();
    await page.goto("/transactions");
    await expect(page.getByText(/Showing 1 transactions/)).toBeVisible();
  });

  test("rejects end date before start date with a visible error", async ({ page }) => {
    await login(page);
    await page.goto("/recurring");
    await page.getByRole("button", { name: "+ Add recurring transaction" }).click();

    await page.locator("#amount-amount").click();
    await page.keyboard.type("1000");
    await page.locator('select[name="categoryId"]').selectOption({ label: "Groceries" });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await page.locator('input[name="endDate"]').fill(yesterday);
    await page.getByRole("button", { name: "Create", exact: true }).click();

    // p[role=alert] — Next's route announcer is also role=alert.
    await expect(page.locator('p[role="alert"]')).toHaveText(
      "End date must be on or after start date"
    );
  });
});

test.describe("budgets and export", () => {
  test("spending over the limit shows the over-budget indicator", async ({ page }) => {
    await login(page);
    await page.goto("/budgets");
    await page.getByRole("button", { name: "+ Food & Dining" }).click();
    await page.locator("#amount-budget-limit").click();
    await page.keyboard.type("5000"); // 50.00
    await page.getByRole("button", { name: "Set budget" }).click();
    await expect(page.getByText("0% used")).toBeVisible();

    await createTransactionViaUI(page, {
      amountDigits: "6000", // 60.00
      category: "Food & Dining",
      note: `over budget ${Date.now()}`,
    });

    await page.goto("/budgets");
    await expect(page.getByText(/Over by \$10\.00/)).toBeVisible();
  });

  test("CSV export contains the transaction with RFC-4180 escaping", async ({ page }) => {
    await login(page);
    const marker = `csv "test", ${Date.now()}`;
    await createTransactionViaUI(page, {
      amountDigits: "1250",
      category: "Groceries",
      note: marker,
    });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Export CSV" }).click(),
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();
    const content = await readFile(path!, "utf8");

    expect(content.startsWith("\uFEFF")).toBe(true); // BOM for Excel
    expect(content).toContain("date,type,category,amount,currency,note");
    expect(content).toContain("12.5"); // Decimal.toString() drops trailing zeros
    expect(content).toContain("Groceries");
    // Quotes doubled and field wrapped because of the comma/quotes.
    const escaped = `"${marker.replace(/"/g, '""')}"`;
    expect(content).toContain(escaped);
  });
});
