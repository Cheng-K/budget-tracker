import { Suspense } from "react";
import { requireUser } from "@/lib/require-user";
import { getBudgetSummary } from "@/lib/queries/budgets";
import { listCategories } from "@/lib/queries/categories";
import { getMonthRange } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetList } from "@/components/budget-list";
import { CopyLastMonthButton } from "@/components/copy-last-month-button";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const monthParam = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const { start: monthDate, key: monthKey } = getMonthRange(monthParam);

  const [summary, categories] = await Promise.all([
    getBudgetSummary(user.id, monthDate),
    listCategories(user.id),
  ]);

  // Categories with an expense kind that don't have budgets yet.
  const budgetedIds = new Set(summary.map((s) => s.categoryId));
  const unbudgeted = categories.filter(
    (c) => c.kind === "EXPENSE" && !budgetedIds.has(c.id)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Budgets</h1>
        <CopyLastMonthButton month={monthKey} />
      </div>

      <Suspense>
        <MonthSwitcher />
      </Suspense>

      <BudgetList
        summary={summary}
        unbudgeted={unbudgeted}
        month={monthKey}
        currency={user.currencyCode ?? "USD"}
      />
    </div>
  );
}
