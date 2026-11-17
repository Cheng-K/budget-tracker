import { Suspense } from "react";
import { requireUser } from "@/lib/require-user";
import { getMonthlySummary, getTrendSeries } from "@/lib/queries/reports";
import { getMonthRange } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { formatMoney } from "@/lib/money";
import { TrendChart } from "@/components/trend-chart-loader";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { StatsRowSkeleton, ListSkeleton, ChartSkeleton } from "@/components/skeletons";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const monthParam = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const { start: monthDate, label: monthLabel } = getMonthRange(monthParam);

  const currency = user.currencyCode ?? "USD";
  // Started eagerly; both sections below await the same in-flight query.
  const summaryPromise = getMonthlySummary(user.id, monthDate);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight">Reports</h1>

      <Suspense>
        <MonthSwitcher />
      </Suspense>

      {/* Monthly summary */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{monthLabel}</h2>
        <Suspense fallback={<StatsRowSkeleton />}>
          <SummaryChips summary={summaryPromise} currency={currency} />
        </Suspense>
      </section>

      {/* Category breakdown */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Spending by category</h2>
        <Suspense fallback={<ListSkeleton rows={5} />}>
          <CategorySection summary={summaryPromise} currency={currency} />
        </Suspense>
      </section>

      {/* Trend chart */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">12-month trend</h2>
        <Suspense fallback={<ChartSkeleton />}>
          <TrendSection userId={user.id} />
        </Suspense>
      </section>
    </div>
  );
}

type SummaryPromise = ReturnType<typeof getMonthlySummary>;

async function SummaryChips({
  summary: summaryPromise,
  currency,
}: {
  summary: SummaryPromise;
  currency: string;
}) {
  const summary = await summaryPromise;

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-3">
        <p className="text-[12px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Income</p>
        <p className="mt-1 text-sm font-semibold text-emerald-600">
          {formatMoney(summary.totalIncome, currency)}
        </p>
      </div>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-3">
        <p className="text-[12px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Expenses</p>
        <p className="mt-1 text-sm font-semibold text-red-600">
          {formatMoney(summary.totalExpenses, currency)}
        </p>
      </div>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-3">
        <p className="text-[12px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Net</p>
        <p className={`mt-1 text-sm font-semibold ${parseFloat(summary.net) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {formatMoney(summary.net, currency)}
        </p>
      </div>
    </div>
  );
}

async function CategorySection({
  summary: summaryPromise,
  currency,
}: {
  summary: SummaryPromise;
  currency: string;
}) {
  const summary = await summaryPromise;

  return (
    <CategoryBreakdown
      items={summary.categoryBreakdown}
      currency={currency}
      totalExpenses={summary.totalExpenses}
    />
  );
}

async function TrendSection({ userId }: { userId: string }) {
  const trend = await getTrendSeries(userId, 12);

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4">
      <TrendChart data={trend} />
    </div>
  );
}
