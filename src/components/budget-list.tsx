"use client";

import { useState, useTransition } from "react";
import type { Category } from "@prisma/client";
import { setBudgetAction, clearBudgetAction } from "@/lib/actions/budgets";
import { formatMoney } from "@/lib/money";

interface BudgetSummaryItem {
  id: string;
  categoryId: string;
  categoryName: string;
  limitAmount: string;
  spentAmount: string;
  percentage: number;
  isOver: boolean;
  isNear: boolean;
}

export function BudgetList({
  summary,
  unbudgeted,
  month,
  currency,
}: {
  summary: BudgetSummaryItem[];
  unbudgeted: Category[];
  month: string;
  currency: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSetBudget(categoryId: string, limitAmount: string) {
    setError(null);
    const formData = new FormData();
    formData.set("categoryId", categoryId);
    formData.set("month", month + "-01");
    formData.set("limitAmount", limitAmount);
    startTransition(async () => {
      const result = await setBudgetAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleClearBudget(categoryId: string) {
    startTransition(() => clearBudgetAction(categoryId, month + "-01"));
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {summary.length === 0 && unbudgeted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">No budget categories yet.</p>
        </div>
      ) : (
        <>
          {summary.length > 0 && (
            <div className="flex flex-col gap-3">
              {summary.map((item) => (
                <BudgetRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  isPending={isPending}
                  onSet={handleSetBudget}
                  onClear={handleClearBudget}
                />
              ))}
            </div>
          )}

          {unbudgeted.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Set a budget
              </h2>
              <div className="flex flex-wrap gap-2">
                {unbudgeted.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      const limit = prompt(`Monthly budget for ${c.name} (${currency}):`);
                      if (limit) handleSetBudget(c.id, limit);
                    }}
                    disabled={isPending}
                    className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    + {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BudgetRow({
  item,
  currency,
  isPending,
  onSet,
  onClear,
}: {
  item: BudgetSummaryItem;
  currency: string;
  isPending: boolean;
  onSet: (categoryId: string, limit: string) => void;
  onClear: (categoryId: string) => void;
}) {
  const barColor = item.isOver
    ? "bg-red-500"
    : item.isNear
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{item.categoryName}</span>
        <span className="text-sm">
          <span className={item.isOver ? "font-semibold text-red-600" : "text-neutral-900 dark:text-neutral-100"}>
            {formatMoney(item.spentAmount, currency)}
          </span>
          <span className="text-neutral-400 dark:text-neutral-500">
            {" / "}
            {formatMoney(item.limitAmount, currency)}
          </span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(item.percentage, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs ${item.isOver ? "text-red-600" : "text-neutral-500 dark:text-neutral-400 dark:text-neutral-500"}`}>
          {item.isOver
            ? `Over by ${formatMoney((parseFloat(item.spentAmount) - parseFloat(item.limitAmount)).toFixed(2), currency)}`
            : `${item.percentage}% used`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const limit = prompt(
                `New monthly budget for ${item.categoryName} (${currency}):`,
                item.limitAmount
              );
              if (limit) onSet(item.categoryId, limit);
            }}
            disabled={isPending}
            className="text-xs font-medium text-emerald-600 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm("Remove this budget?")) onClear(item.categoryId);
            }}
            disabled={isPending}
            className="text-xs font-medium text-neutral-400 dark:text-neutral-500 hover:text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
