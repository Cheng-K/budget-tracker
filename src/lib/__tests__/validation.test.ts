import { describe, it, expect } from "vitest";
import {
  createTransactionSchema,
  createCategorySchema,
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  reorderPaymentMethodsSchema,
  setBudgetSchema,
  createTemplateSchema,
  transactionFilterSchema,
} from "@/lib/validation";

describe("createTransactionSchema", () => {
  const valid = {
    type: "EXPENSE",
    amount: "42.50",
    categoryId: "cat123",
    date: "2026-01-15",
    note: "Coffee",
    paymentMethodId: "pm_test_1",
  };

  it("accepts valid input", () => {
    const result = createTransactionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts input without optional fields", () => {
    const result = createTransactionSchema.safeParse({
      type: "EXPENSE",
      amount: "10",
      categoryId: "cat1",
      date: "2026-01-01",
      paymentMethodId: "pm_test_1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing amount", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      amount: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric amount", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      amount: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing categoryId", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      categoryId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty date", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      date: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-ISO date", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      date: "15-01-2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects garbage date", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      date: "garbage",
    });
    expect(result.success).toBe(false);
  });

  it("rejects overflow calendar date (Feb 31)", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      date: "2026-02-31",
    });
    expect(result.success).toBe(false);
  });

  it("accepts leap day", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      date: "2024-02-29",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty paymentMethodId", () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      paymentMethodId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createPaymentMethodSchema", () => {
  it("accepts valid input", () => {
    const result = createPaymentMethodSchema.safeParse({ name: "Cash" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createPaymentMethodSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 50 chars", () => {
    const result = createPaymentMethodSchema.safeParse({ name: "x".repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe("updatePaymentMethodSchema", () => {
  it("accepts name-only update", () => {
    const result = updatePaymentMethodSchema.safeParse({
      id: "pm1",
      name: "Petty cash",
    });
    expect(result.success).toBe(true);
  });

  it("accepts hidden toggle", () => {
    const result = updatePaymentMethodSchema.safeParse({
      id: "pm1",
      isHidden: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = updatePaymentMethodSchema.safeParse({ id: "", name: "Cash" });
    expect(result.success).toBe(false);
  });
});

describe("reorderPaymentMethodsSchema", () => {
  it("accepts id list", () => {
    const result = reorderPaymentMethodsSchema.safeParse({ ids: ["pm1", "pm2"] });
    expect(result.success).toBe(true);
  });

  it("rejects empty id list", () => {
    const result = reorderPaymentMethodsSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });
});

describe("createCategorySchema", () => {
  it("accepts valid input", () => {
    const result = createCategorySchema.safeParse({
      name: "Food",
      kind: "EXPENSE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCategorySchema.safeParse({
      name: "",
      kind: "EXPENSE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid kind", () => {
    const result = createCategorySchema.safeParse({
      name: "Food",
      kind: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("setBudgetSchema", () => {
  it("accepts valid input", () => {
    const result = setBudgetSchema.safeParse({
      categoryId: "cat1",
      month: "2026-01-01",
      limitAmount: "500.00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative limit", () => {
    const result = setBudgetSchema.safeParse({
      categoryId: "cat1",
      month: "2026-01-01",
      limitAmount: "-100",
    });
    expect(result.success).toBe(false);
  });

  it("accepts YYYY-MM month key", () => {
    const result = setBudgetSchema.safeParse({
      categoryId: "cat1",
      month: "2026-01",
      limitAmount: "500.00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects garbage month", () => {
    const result = setBudgetSchema.safeParse({
      categoryId: "cat1",
      month: "garbage",
      limitAmount: "500.00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects month 13", () => {
    const result = setBudgetSchema.safeParse({
      categoryId: "cat1",
      month: "2026-13-01",
      limitAmount: "500.00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-first day of month", () => {
    const result = setBudgetSchema.safeParse({
      categoryId: "cat1",
      month: "2026-01-15",
      limitAmount: "500.00",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTemplateSchema", () => {
  const valid = {
    type: "EXPENSE",
    amount: "120.00",
    categoryId: "cat1",
    frequency: "MONTHLY",
    startDate: "2026-01-31",
    endDate: "",
    note: "Rent",
    paymentMethodId: "pm1",
  };

  it("accepts valid input", () => {
    const result = createTemplateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts endDate on or after startDate", () => {
    expect(
      createTemplateSchema.safeParse({ ...valid, endDate: "2026-12-31" }).success
    ).toBe(true);
    expect(
      createTemplateSchema.safeParse({ ...valid, endDate: valid.startDate }).success
    ).toBe(true);
  });

  it("rejects endDate before startDate", () => {
    const result = createTemplateSchema.safeParse({
      ...valid,
      endDate: "2025-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = createTemplateSchema.safeParse({ ...valid, amount: "-120" });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric amount", () => {
    const result = createTemplateSchema.safeParse({ ...valid, amount: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects amount with more than 4 decimals", () => {
    const result = createTemplateSchema.safeParse({ ...valid, amount: "1.23456" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid frequency", () => {
    const result = createTemplateSchema.safeParse({ ...valid, frequency: "DAILY" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createTemplateSchema.safeParse({ ...valid, type: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid startDate", () => {
    const result = createTemplateSchema.safeParse({ ...valid, startDate: "garbage" });
    expect(result.success).toBe(false);
  });

  it("rejects overflow startDate (Feb 31)", () => {
    const result = createTemplateSchema.safeParse({ ...valid, startDate: "2026-02-31" });
    expect(result.success).toBe(false);
  });

  it("rejects missing paymentMethodId", () => {
    const result = createTemplateSchema.safeParse({ ...valid, paymentMethodId: "" });
    expect(result.success).toBe(false);
  });
});

describe("transactionFilterSchema", () => {
  it("applies defaults", () => {
    const result = transactionFilterSchema.parse({});
    expect(result.limit).toBe(50);
  });

  it("accepts filters", () => {
    const result = transactionFilterSchema.safeParse({
      q: "coffee",
      type: "EXPENSE",
      categoryId: "cat1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      amountMin: "10",
      amountMax: "100",
    });
    expect(result.success).toBe(true);
  });

  it("rejects limit > 200", () => {
    const result = transactionFilterSchema.safeParse({ limit: 500 });
    expect(result.success).toBe(false);
  });
});
