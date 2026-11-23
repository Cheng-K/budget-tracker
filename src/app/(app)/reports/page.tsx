import { Suspense } from "react";
import { requireUser } from "@/lib/require-user";
import { getMonthlySummary, getTrendSeries } from "@/lib/queries/reports";
import { getMonthRange } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { SummaryStats } from "@/components/summary-stats";
import { TrendChart } from "@/components/trend-chart-loader";
import { CategoryPieChart } from "@/components/category-pie-chart-loader";
import { StatsRowSkeleton, ChartSkeleton } from "@/components/skeletons";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const monthParam = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const { start: monthDate, key: monthKey, label: monthLabel } = getMonthRange(monthParam);

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
          <SummarySection summary={summaryPromise} currency={currency} />
        </Suspense>
      </section>

      {/* Category breakdown */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Spending by category</h2>
        <Suspense fallback={<ChartSkeleton />}>
          <CategorySection summary={summaryPromise} currency={currency} monthKey={monthKey} />
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

async function SummarySection({
  summary: summaryPromise,
  currency,
}: {
  summary: SummaryPromise;
  currency: string;
}) {
  const summary = await summaryPromise;

  return (
    <div className="mt-3">
      <SummaryStats
        income={summary.totalIncome}
        expenses={summary.totalExpenses}
        net={summary.net}
        currency={currency}
      />
    </div>
  );
}

async function CategorySection({
  summary: summaryPromise,
  currency,
  monthKey,
}: {
  summary: SummaryPromise;
  currency: string;
  monthKey: string;
}) {
  const summary = await summaryPromise;

  return (
    <CategoryPieChart
      key={monthKey}
      items={summary.categoryBreakdown}
      currency={currency}
      totalExpenses={summary.totalExpenses}
      monthKey={monthKey}
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
