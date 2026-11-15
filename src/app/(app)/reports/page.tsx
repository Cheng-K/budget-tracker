import { Suspense } from "react";
import { requireUser } from "@/lib/require-user";
import { getMonthlySummary, getTrendSeries } from "@/lib/queries/reports";
import { getMonthRange } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { formatMoney } from "@/lib/money";
import { TrendChart } from "@/components/trend-chart";
import { CategoryBreakdown } from "@/components/category-breakdown";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const monthParam = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const { start: monthDate, label: monthLabel } = getMonthRange(monthParam);

  const [summary, trend] = await Promise.all([
    getMonthlySummary(user.id, monthDate),
    getTrendSeries(user.id, 12),
  ]);

  const currency = user.currencyCode ?? "USD";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight">Reports</h1>

      <Suspense>
        <MonthSwitcher />
      </Suspense>

      {/* Monthly summary */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700">{monthLabel}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Income</p>
            <p className="mt-1 text-sm font-semibold text-emerald-600">
              {formatMoney(summary.totalIncome, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Expenses</p>
            <p className="mt-1 text-sm font-semibold text-red-600">
              {formatMoney(summary.totalExpenses, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Net</p>
            <p className={`mt-1 text-sm font-semibold ${parseFloat(summary.net) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatMoney(summary.net, currency)}
            </p>
          </div>
        </div>
      </section>

      {/* Category breakdown */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700">Spending by category</h2>
        <CategoryBreakdown
          items={summary.categoryBreakdown}
          currency={currency}
          totalExpenses={summary.totalExpenses}
        />
      </section>

      {/* Trend chart */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700">12-month trend</h2>
        <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
          <TrendChart data={trend} />
        </div>
      </section>
    </div>
  );
}
