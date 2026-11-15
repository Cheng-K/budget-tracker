import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getMonthlySummary(userId: string, month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const [incomeAgg, expenseAgg, byCategory, budgets] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.budget.findMany({
      where: { userId, month: monthStart },
    }),
  ]);

  // Get category names
  const categoryIds = byCategory.map((c) => c.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b.limitAmount.toString()]));

  const categoryBreakdown = byCategory
    .map((c) => ({
      categoryId: c.categoryId,
      name: catMap.get(c.categoryId) ?? "Unknown",
      amount: c._sum.amount?.toString() ?? "0",
      count: c._count,
      budget: budgetMap.get(c.categoryId) ?? null,
    }))
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

  return {
    totalIncome: incomeAgg._sum.amount?.toString() ?? "0",
    totalExpenses: expenseAgg._sum.amount?.toString() ?? "0",
    net: (
      parseFloat(incomeAgg._sum.amount?.toString() ?? "0") -
      parseFloat(expenseAgg._sum.amount?.toString() ?? "0")
    ).toFixed(2),
    categoryBreakdown,
  };
}

export async function getTrendSeries(userId: string, months: number = 12) {
  const now = new Date();
  const monthsList = Array.from({ length: months }, (_, i) => {
    const m = subMonths(now, months - 1 - i);
    return {
      month: startOfMonth(m),
      label: format(m, "MMM"),
      fullLabel: format(m, "MMM yyyy"),
    };
  });

  const startDate = monthsList[0].month;
  const endDate = endOfMonth(monthsList[monthsList.length - 1].month);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      type: true,
      amount: true,
      date: true,
    },
  });

  return monthsList.map(({ month, label, fullLabel }) => {
    const monthStart = month;
    const monthEnd = endOfMonth(month);

    let income = 0;
    let expenses = 0;

    for (const t of transactions) {
      if (t.date >= monthStart && t.date <= monthEnd) {
        const amount = parseFloat(t.amount.toString());
        if (t.type === "INCOME") income += amount;
        else expenses += amount;
      }
    }

    return {
      label,
      fullLabel,
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      net: (income - expenses).toFixed(2),
    };
  });
}
