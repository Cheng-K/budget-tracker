import Link from "next/link";
import { format } from "date-fns";
import { formatMoney } from "@/lib/money";
import type { SerializedTransaction } from "@/lib/queries/transactions";

export function TransactionList({
  items,
  currency,
}: {
  items: SerializedTransaction[];
  currency: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">No transactions found.</p>
        <Link
          href="/transactions/new"
          className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Add one
        </Link>
      </div>
    );
  }

  // Group by date.
  const groups = new Map<string, SerializedTransaction[]>();
  for (const t of items) {
    const key = t.date.toISOString().slice(0, 10);
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([dateKey, txns]) => (
        <div key={dateKey}>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {format(new Date(dateKey + "T00:00:00Z"), "EEE, MMM d")}
          </h3>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            {txns.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transactions/${t.id}`}
                  className="flex items-center justify-between px-4 py-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {t.category.name}
                    </span>
                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                      {t.note || t.paymentMethod.name}
                      {t.receipt ? " · 📎" : ""}
                    </span>
                  </div>
                  <span
                    className={`ml-3 shrink-0 text-sm font-medium ${
                      t.type === "INCOME" ? "text-emerald-600" : "text-neutral-900 dark:text-neutral-100"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatMoney(t.amount, t.currencyCode || currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
