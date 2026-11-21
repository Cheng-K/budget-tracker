import { prisma } from "@/lib/db";
import { getPrevMonth } from "@/lib/month";
import { toDecimal, ZERO } from "@/lib/money";

export async function getBudgets(userId: string, month: Date) {
  return prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
  });
}

export async function setBudget(
  userId: string,
  categoryId: string,
  month: Date,
  limitAmount: string | { toString(): string }
) {
  return prisma.budget.upsert({
    where: {
      userId_categoryId_month: { userId, categoryId, month },
    },
    update: { limitAmount: limitAmount.toString() },
    create: {
      userId,
      categoryId,
      month,
      limitAmount: limitAmount.toString(),
    },
  });
}

export async function clearBudget(userId: string, categoryId: string, month: Date) {
  await prisma.budget.deleteMany({
    where: { userId, categoryId, month },
  });
}

export async function copyLastMonthBudgets(userId: string, month: Date) {
  const lastMonth = getPrevMonth(month);
  const lastBudgets = await prisma.budget.findMany({
    where: { userId, month: lastMonth },
  });

  if (lastBudgets.length === 0) return 0;

  await prisma.budget.createMany({
    data: lastBudgets.map((b) => ({
      userId,
      categoryId: b.categoryId,
      month,
      limitAmount: b.limitAmount,
    })),
    skipDuplicates: true,
  });

  return lastBudgets.length;
}

export async function getBudgetSummary(userId: string, month: Date) {
  // month is already the 1st of the month in UTC (from getMonthRange).
  // Month-end = last day of the same month in UTC.
  const monthStart = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));

  const [budgets, spending] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, month: monthStart },
      include: { category: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const spendingMap = new Map(
    spending.map((s) => [s.categoryId, s._sum.amount?.toString() ?? "0"])
  );

  return budgets.map((b) => {
    const spentStr = spendingMap.get(b.categoryId) ?? "0";
    const limitStr = b.limitAmount.toString();
    const spent = toDecimal(spentStr);
    const limit = toDecimal(limitStr);
    const pct = limit.gt(0) ? spent.div(limit).mul(100) : ZERO;

    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      limitAmount: limitStr,
      spentAmount: spentStr,
      percentage: Math.round(Math.min(pct.toNumber(), 999)),
      isOver: spent.gt(limit),
      isNear: pct.gte(70) && spent.lte(limit),
    };
  });
}
