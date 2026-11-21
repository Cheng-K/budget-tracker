import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setBudgetAction,
  clearBudgetAction,
  copyLastMonthBudgetsAction,
} from "@/lib/actions/budgets";
import { getBudgets, getBudgetSummary, setBudget } from "@/lib/queries/budgets";
import {
  createTestUser,
  cleanupTestUsers,
  actAs,
  addTransaction,
  txFormData,
  type TestUser,
} from "./helpers";

const NOV = new Date(Date.UTC(2026, 10, 1));
const OCT = new Date(Date.UTC(2026, 9, 1));

let t: TestUser;

beforeEach(async () => {
  t = await createTestUser();
  actAs(t);
});

afterEach(async () => {
  await cleanupTestUsers();
  vi.clearAllMocks();
});

function budgetFields(categoryId: string, month: string, limitAmount: string) {
  return txFormData({ categoryId, month, limitAmount });
}

describe("setBudgetAction", () => {
  it("upserts one row per (user, category, month)", async () => {
    await setBudgetAction(budgetFields(t.category.id, "2026-11-01", "50.00"));
    await setBudgetAction(budgetFields(t.category.id, "2026-11-01", "75.00"));

    const rows = await getBudgets(t.user.id, NOV);
    expect(rows).toHaveLength(1);
    expect(rows[0].limitAmount.toString()).toBe("75");
  });

  it("accepts YYYY-MM and normalizes to the first of the month", async () => {
    await setBudgetAction(budgetFields(t.category.id, "2026-11", "50.00"));
    await setBudgetAction(budgetFields(t.category.id, "2026-11-01", "60.00"));

    const rows = await getBudgets(t.user.id, NOV);
    expect(rows).toHaveLength(1);
    expect(rows[0].month.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(rows[0].limitAmount.toString()).toBe("60");
  });

  it("rejects a garbage month", async () => {
    const result = await setBudgetAction(
      budgetFields(t.category.id, "garbage", "50.00")
    );
    expect(result).toEqual({ error: "Month must be YYYY-MM or YYYY-MM-01" });
  });

  it("rejects another user's category", async () => {
    const b = await createTestUser();
    const result = await setBudgetAction(
      budgetFields(b.category.id, "2026-11-01", "50.00")
    );
    expect(result).toEqual({ error: "Invalid category" });
  });
});

describe("clearBudgetAction", () => {
  it("cannot clear another user's budget", async () => {
    await setBudget(t.user.id, t.category.id, NOV, "50.00");
    const b = await createTestUser();
    actAs(b);

    await clearBudgetAction(t.category.id, "2026-11-01");
    expect(await getBudgets(t.user.id, NOV)).toHaveLength(1);
  });

  it("rejects an invalid month", async () => {
    const result = await clearBudgetAction(t.category.id, "2026-13-01");
    expect(result).toEqual({ error: "Invalid month" });
  });
});

describe("copyLastMonthBudgetsAction", () => {
  it("copies limits forward and skips duplicates on re-run", async () => {
    await setBudget(t.user.id, t.category.id, OCT, "30.00");

    await copyLastMonthBudgetsAction("2026-11");
    await copyLastMonthBudgetsAction("2026-11");

    const rows = await getBudgets(t.user.id, NOV);
    expect(rows).toHaveLength(1);
    expect(rows[0].limitAmount.toString()).toBe("30");
  });

  it("does nothing when last month has no budgets", async () => {
    await copyLastMonthBudgetsAction("2026-11");
    expect(await getBudgets(t.user.id, NOV)).toHaveLength(0);
  });
});

describe("getBudgetSummary", () => {
  it("computes percentage and near/over boundaries exactly", async () => {
    await setBudget(t.user.id, t.category.id, NOV, "100.00");
    await addTransaction(t, { amount: "70.00" });

    let [summary] = await getBudgetSummary(t.user.id, NOV);
    expect(summary.percentage).toBe(70);
    expect(summary.isNear).toBe(true);
    expect(summary.isOver).toBe(false);

    await addTransaction(t, { amount: "30.00" }); // exactly at limit
    [summary] = await getBudgetSummary(t.user.id, NOV);
    expect(summary.percentage).toBe(100);
    expect(summary.isOver).toBe(false);

    await addTransaction(t, { amount: "0.01" }); // over
    [summary] = await getBudgetSummary(t.user.id, NOV);
    expect(summary.isOver).toBe(true);
    expect(summary.isNear).toBe(false);
  });

  it("excludes income from spending", async () => {
    await setBudget(t.user.id, t.category.id, NOV, "100.00");
    await addTransaction(t, {
      type: "INCOME",
      categoryId: t.incomeCategory.id,
      amount: "500.00",
    });
    const [summary] = await getBudgetSummary(t.user.id, NOV);
    expect(summary.spentAmount).toBe("0");
    expect(summary.isOver).toBe(false);
  });

  it("is Decimal-exact at 4dp (1.005 spent vs 1.00 limit)", async () => {
    await setBudget(t.user.id, t.category.id, NOV, "1.00");
    await addTransaction(t, { amount: "1.005" });

    const [summary] = await getBudgetSummary(t.user.id, NOV);
    expect(summary.spentAmount).toBe("1.005");
    expect(summary.isOver).toBe(true);
    expect(summary.percentage).toBe(101); // 100.5 rounds half-up
  });

  it("includes the last day of the month and excludes the next month", async () => {
    await setBudget(t.user.id, t.category.id, NOV, "100.00");
    await addTransaction(t, {
      amount: "10.00",
      date: new Date("2026-11-30T00:00:00Z"),
    });
    await addTransaction(t, {
      amount: "99.00",
      date: new Date("2026-12-01T00:00:00Z"),
    });

    const [summary] = await getBudgetSummary(t.user.id, NOV);
    expect(summary.spentAmount).toBe("10");
  });
});
