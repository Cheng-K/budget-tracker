import { prisma } from "@/lib/db";
import { startOfMonth, subMonths, format } from "date-fns";

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
  const lastMonth = startOfMonth(subMonths(month, 1));
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
  const monthStart = startOfMonth(month);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

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
    const spent = spendingMap.get(b.categoryId) ?? "0";
    const limit = b.limitAmount.toString();
    const spentNum = parseFloat(spent);
    const limitNum = parseFloat(limit);
    const pct = limitNum > 0 ? Math.min((spentNum / limitNum) * 100, 999) : 0;

    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      limitAmount: limit,
      spentAmount: spent,
      percentage: Math.round(pct),
      isOver: spentNum > limitNum,
      isNear: pct >= 70 && spentNum <= limitNum,
    };
  });
}
