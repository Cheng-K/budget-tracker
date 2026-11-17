import { prisma } from "@/lib/db";
import { utcMonthStart, utcMonthEnd, getPrevMonth } from "@/lib/month";

function monthLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

function monthYearLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export async function getMonthlySummary(userId: string, month: Date) {
  // month is already the 1st of the month in UTC.
  const monthStart = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const monthEnd = utcMonthEnd(month.getUTCFullYear(), month.getUTCMonth());

  const [byTypeCategory, budgets, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type", "categoryId"],
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.budget.findMany({
      where: { userId, month: monthStart },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true },
    }),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b.limitAmount.toString()]));

  let income = 0;
  let expenses = 0;
  const expenseByCategory = new Map<string, { amount: number; count: number }>();

  for (const row of byTypeCategory) {
    const amount = parseFloat(row._sum.amount?.toString() ?? "0");
    if (row.type === "INCOME") {
      income += amount;
    } else {
      expenses += amount;
      const entry = expenseByCategory.get(row.categoryId) ?? { amount: 0, count: 0 };
      entry.amount += amount;
      entry.count += row._count;
      expenseByCategory.set(row.categoryId, entry);
    }
  }

  const categoryBreakdown = [...expenseByCategory.entries()]
    .map(([categoryId, { amount, count }]) => ({
      categoryId,
      name: catMap.get(categoryId) ?? "Unknown",
      amount: amount.toFixed(2),
      count,
      budget: budgetMap.get(categoryId) ?? null,
    }))
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

  return {
    totalIncome: income.toFixed(2),
    totalExpenses: expenses.toFixed(2),
    net: (income - expenses).toFixed(2),
    categoryBreakdown,
  };
}

export async function getTrendSeries(userId: string, months: number = 12) {
  const now = new Date();
  const monthsList = Array.from({ length: months }, (_, i) => {
    // Walk backwards from the current month (UTC).
    let m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    for (let j = 0; j < months - 1 - i; j++) {
      m = getPrevMonth(m);
    }
    return {
      month: m,
      label: monthLabel(m),
      fullLabel: monthYearLabel(m),
    };
  });

  const startDate = monthsList[0].month;
  const lastMonth = monthsList[monthsList.length - 1].month;
  const endDate = utcMonthEnd(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth());

  const rows = await prisma.$queryRaw<{ month: string; type: string; total: string }[]>`
    SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
           "type"::text AS type,
           SUM("amount")::text AS total
    FROM "Transaction"
    WHERE "userId" = ${userId} AND "date" >= ${startDate} AND "date" <= ${endDate}
    GROUP BY 1, 2
  `;

  const byMonth = new Map<string, { income: number; expenses: number }>();
  for (const row of rows) {
    const entry = byMonth.get(row.month) ?? { income: 0, expenses: 0 };
    const amount = parseFloat(row.total);
    if (row.type === "INCOME") entry.income += amount;
    else entry.expenses += amount;
    byMonth.set(row.month, entry);
  }

  return monthsList.map(({ month, label, fullLabel }) => {
    const key = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
    const { income, expenses } = byMonth.get(key) ?? { income: 0, expenses: 0 };

    return {
      label,
      fullLabel,
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      net: (income - expenses).toFixed(2),
    };
  });
}
