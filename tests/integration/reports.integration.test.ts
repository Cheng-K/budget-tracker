import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { getMonthlySummary, getTrendSeries } from "@/lib/queries/reports";
import { setBudget } from "@/lib/queries/budgets";
import {
  createTestUser,
  cleanupTestUsers,
  addTransaction,
  type TestUser,
} from "./helpers";

const NOV = new Date(Date.UTC(2026, 10, 1));

let t: TestUser;

beforeEach(async () => {
  t = await createTestUser();
});

afterEach(async () => {
  await cleanupTestUsers();
});

describe("getMonthlySummary", () => {
  it("totals are Decimal-exact (1.005 rounds half-up, not float-down)", async () => {
    await addTransaction(t, { amount: "1.00" });
    await addTransaction(t, { amount: "0.005" });
    await addTransaction(t, {
      type: "INCOME",
      categoryId: t.incomeCategory.id,
      amount: "0.30",
    });

    const summary = await getMonthlySummary(t.user.id, NOV);
    expect(summary.totalExpenses).toBe("1.01");
    expect(summary.totalIncome).toBe("0.30");
    expect(summary.net).toBe("-0.71");
  });

  it("breakdown sorts by amount desc with counts and budgets", async () => {
    const other = await prisma.category.create({
      data: { userId: t.user.id, name: "Other", kind: "EXPENSE" },
    });
    await addTransaction(t, { amount: "30.00" });
    await addTransaction(t, { amount: "20.00" });
    await addTransaction(t, { categoryId: other.id, amount: "60.00" });
    await setBudget(t.user.id, other.id, NOV, "100.00");

    const summary = await getMonthlySummary(t.user.id, NOV);
    expect(summary.categoryBreakdown.map((c) => c.amount)).toEqual(["60.00", "50.00"]);
    expect(summary.categoryBreakdown[0].count).toBe(1);
    expect(summary.categoryBreakdown[0].budget).toBe("100");
    const food = summary.categoryBreakdown.find((c) => c.categoryId === t.category.id);
    expect(food?.amount).toBe("50.00");
    expect(food?.count).toBe(2);
    expect(food?.budget).toBeNull();
  });

  it("respects month boundaries (Oct 31 out, Nov 1 and Nov 30 in)", async () => {
    await addTransaction(t, { amount: "99.00", date: new Date("2026-10-31T00:00:00Z") });
    await addTransaction(t, { amount: "1.00", date: new Date("2026-11-01T00:00:00Z") });
    await addTransaction(t, { amount: "2.00", date: new Date("2026-11-30T00:00:00Z") });

    const summary = await getMonthlySummary(t.user.id, NOV);
    expect(summary.totalExpenses).toBe("3.00");
  });
});

describe("getTrendSeries", () => {
  it("buckets transactions into the right UTC months", async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15));
    const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));

    await addTransaction(t, { amount: "40.00", date: thisMonth });
    await addTransaction(t, {
      type: "INCOME",
      categoryId: t.incomeCategory.id,
      amount: "100.00",
      date: thisMonth,
    });
    await addTransaction(t, { amount: "25.00", date: prevMonth });

    const series = await getTrendSeries(t.user.id, 3);
    expect(series).toHaveLength(3);
    expect(series[2]).toMatchObject({ income: "100.00", expenses: "40.00", net: "60.00" });
    expect(series[1]).toMatchObject({ income: "0.00", expenses: "25.00", net: "-25.00" });
    expect(series[0]).toMatchObject({ income: "0.00", expenses: "0.00", net: "0.00" });
  });
});
