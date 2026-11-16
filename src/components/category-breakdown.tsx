import { formatMoney } from "@/lib/money";

interface CategoryItem {
  categoryId: string;
  name: string;
  amount: string;
  count: number;
  budget: string | null;
}

export function CategoryBreakdown({
  items,
  currency,
  totalExpenses,
}: {
  items: CategoryItem[];
  currency: string;
  totalExpenses: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-6 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">No expenses this month.</p>
      </div>
    );
  }

  const total = parseFloat(totalExpenses) || 1;
  const maxAmount = Math.max(...items.map((i) => parseFloat(i.amount)));

  return (
    <div className="mt-3 flex flex-col gap-2">
      {items.map((item) => {
        const pct = (parseFloat(item.amount) / total) * 100;
        const barPct = maxAmount > 0 ? (parseFloat(item.amount) / maxAmount) * 100 : 0;

        return (
          <div key={item.categoryId} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm">
                <span className="font-medium">{formatMoney(item.amount, currency)}</span>
                <span className="ml-1 text-xs text-neutral-400 dark:text-neutral-500">{pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${barPct}%` }}
              />
            </div>
            {item.budget && (
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                Budget: {formatMoney(item.budget, currency)}
                {parseFloat(item.amount) > parseFloat(item.budget) && (
                  <span className="ml-1 text-red-500">
                    (over by {formatMoney((parseFloat(item.amount) - parseFloat(item.budget)).toFixed(2), currency)})
                  </span>
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
