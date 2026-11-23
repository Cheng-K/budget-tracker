import { formatMoney, toDecimal, type MoneyInput } from "@/lib/money";

export function SummaryStats({
  income,
  expenses,
  net,
  currency,
}: {
  income: MoneyInput;
  expenses: MoneyInput;
  net: MoneyInput;
  currency: string;
}) {
  const netNegative = toDecimal(net).isNegative();

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-4">
      <p className="text-[12px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Net</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          netNegative ? "text-red-600" : "text-emerald-600"
        }`}
      >
        {formatMoney(net, currency)}
      </p>
      <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Income</span>
          <span className="text-right text-sm font-semibold tabular-nums text-emerald-600">
            {formatMoney(income, currency)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Expenses</span>
          <span className="text-right text-sm font-semibold tabular-nums text-red-600">
            {formatMoney(expenses, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
