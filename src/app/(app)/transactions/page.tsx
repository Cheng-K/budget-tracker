import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/require-user";
import { listTransactions } from "@/lib/queries/transactions";
import { listCategories } from "@/lib/queries/categories";
import { transactionFilterSchema } from "@/lib/validation";
import { formatMoney } from "@/lib/money";
import { getMonthRange } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionList } from "@/components/transaction-list";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const single = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const { start, end, label } = getMonthRange(single(sp.month));

  // If custom date filters are provided, they override the month range.
  const filter = transactionFilterSchema.parse({
    q: single(sp.q) || undefined,
    type: single(sp.type) || undefined,
    categoryId: single(sp.categoryId) || undefined,
    dateFrom: single(sp.dateFrom) || start.toISOString().slice(0, 10),
    dateTo: single(sp.dateTo) || end.toISOString().slice(0, 10),
    amountMin: single(sp.amountMin) || undefined,
    amountMax: single(sp.amountMax) || undefined,
    limit: 50,
  });

  const [transactions, categories] = await Promise.all([
    listTransactions(user.id, filter),
    listCategories(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Transactions</h1>
        <Link
          href={`/api/export/csv?${new URLSearchParams({
            ...(filter.dateFrom && { dateFrom: filter.dateFrom }),
            ...(filter.dateTo && { dateTo: filter.dateTo }),
            ...(filter.q && { q: filter.q }),
            ...(filter.type && { type: filter.type }),
            ...(filter.categoryId && { categoryId: filter.categoryId }),
          }).toString()}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          Export CSV
        </Link>
      </div>

      {!sp.dateFrom && !sp.dateTo && (
        <Suspense>
          <MonthSwitcher />
        </Suspense>
      )}

      <Suspense>
        <TransactionFilters categories={categories} />
      </Suspense>

      <TransactionList
        items={transactions.items}
        currency={user.currencyCode ?? "USD"}
      />

      <p className="text-center text-xs text-neutral-400">
        Showing {transactions.items.length} of {transactions.total} transactions for {label}
      </p>
    </div>
  );
}
