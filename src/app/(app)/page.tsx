import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { findCurrency } from "@/lib/currencies";
import { getBudgetSummary } from "@/lib/queries/budgets";
import { endOfMonth, startOfMonth } from "date-fns";

export default async function DashboardPage() {
  const user = await requireUser();
  const currency = findCurrency(user.currencyCode ?? "USD") ?? {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
  };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [incomeAgg, expenseAgg, recent, budgetSummary] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 5,
      include: { category: true },
    }),
    getBudgetSummary(user.id, monthStart),
  ]);

  const income = incomeAgg._sum.amount ?? 0;
  const expenses = expenseAgg._sum.amount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-lg font-semibold tracking-tight">
          {now.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h1>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <SummaryChip label="Income" value={formatMoney(income, currency.code)} tone="green" />
          <SummaryChip label="Expenses" value={formatMoney(expenses, currency.code)} tone="red" />
          <SummaryChip label="Net" value={formatMoney(Number(income) - Number(expenses), currency.code)} tone="neutral" />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-700">Budget progress</h2>
          <Link href="/budgets" className="text-xs font-medium text-emerald-600 hover:underline">
            See all
          </Link>
        </div>
        {budgetSummary.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center">
            <p className="text-sm text-neutral-500">No budgets set for this month.</p>
            <Link
              href="/budgets"
              className="mt-2 inline-block text-sm font-medium text-emerald-600 hover:underline"
            >
              Set budgets
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {budgetSummary.slice(0, 5).map((b) => (
              <div key={b.id} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{b.categoryName}</span>
                  <span className="text-xs text-neutral-500">
                    <span className={b.isOver ? "font-semibold text-red-600" : ""}>
                      {formatMoney(b.spentAmount, currency.code)}
                    </span>
                    {" / "}
                    {formatMoney(b.limitAmount, currency.code)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full ${
                      b.isOver ? "bg-red-500" : b.isNear ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-700">Recent transactions</h2>
          <Link href="/transactions" className="text-xs font-medium text-emerald-600 hover:underline">
            See all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
            <p className="text-sm text-neutral-500">No transactions yet.</p>
            <Link
              href="/transactions/new"
              className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Add your first
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transactions/${t.id}`}
                  className="flex items-center justify-between px-4 py-3 transition hover:bg-neutral-50"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{t.category.name}</span>
                    <span className="text-xs text-neutral-500">
                      {t.date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {t.note ? ` · ${t.note}` : ""}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      t.type === "INCOME" ? "text-emerald-600" : "text-neutral-900"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatMoney(t.amount, t.currencyCode)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "neutral";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-600"
        : "text-neutral-900";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
