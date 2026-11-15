import { describe, it, expect } from "vitest";
import {
  createTransactionSchema,
  createCategorySchema,
  setBudgetSchema,
  transactionFilterSchema,
} from "@/lib/validation";

describe("createTransactionSchema", () => {
  const valid = {
    type: "EXPENSE",
    amount: "42.50",
    categoryId: "cat123",
    date: "2026-01-15",
    note: "Coffee",
    paymentMethod: "CASH",
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
