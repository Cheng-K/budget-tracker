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
import { ListSkeleton } from "@/components/skeletons";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);

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

  // Started eagerly so it runs in parallel with categories; streamed below.
  const listPromise = listTransactions(user.id, filter);
  const categories = await listCategories(user.id);

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
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 transition hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800"
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

      <Suspense fallback={<ListSkeleton rows={8} />}>
        <TransactionListSection
          transactions={listPromise}
          label={label}
          currency={user.currencyCode ?? "USD"}
        />
      </Suspense>
    </div>
  );
}

async function TransactionListSection({
  transactions: listPromise,
  label,
  currency,
}: {
  transactions: ReturnType<typeof listTransactions>;
  label: string;
  currency: string;
}) {
  const transactions = await listPromise;

  return (
    <>
      <TransactionList
        items={transactions.items}
        currency={currency}
      />
      <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
        Showing {transactions.items.length} transactions for {label}
      </p>
    </>
  );
}
