"use client";

import { useState, useTransition } from "react";
import type { Category } from "@prisma/client";
import { setBudgetAction, clearBudgetAction } from "@/lib/actions/budgets";
import { formatMoney } from "@/lib/money";
import { BudgetAmountModal } from "@/components/budget-amount-modal";
import { ConfirmModal } from "@/components/confirm-modal";

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

type ModalState =
  | { kind: "none" }
  | { kind: "set"; categoryId: string; categoryName: string }
  | { kind: "edit"; categoryId: string; categoryName: string; currentAmount: string }
  | { kind: "remove"; categoryId: string; categoryName: string };

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
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  function handleSetBudget(categoryId: string, limitAmount: string) {
    setError(null);
    const formData = new FormData();
    formData.set("categoryId", categoryId);
    formData.set("month", month + "-01");
    formData.set("limitAmount", limitAmount);
    startTransition(async () => {
      const result = await setBudgetAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setModal({ kind: "none" });
      }
    });
  }

  function handleClearBudget(categoryId: string) {
    startTransition(async () => {
      await clearBudgetAction(categoryId, month + "-01");
      setModal({ kind: "none" });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {summary.length === 0 && unbudgeted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No budget categories yet.</p>
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
                  onEdit={() =>
                    setModal({
                      kind: "edit",
                      categoryId: item.categoryId,
                      categoryName: item.categoryName,
                      currentAmount: item.limitAmount,
                    })
                  }
                  onRemove={() =>
                    setModal({
                      kind: "remove",
                      categoryId: item.categoryId,
                      categoryName: item.categoryName,
                    })
                  }
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
                    onClick={() =>
                      setModal({ kind: "set", categoryId: c.id, categoryName: c.name })
                    }
                    disabled={isPending}
                    className="rounded-full border border-neutral-300 px-4 py-2 text-sm text-neutral-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-neutral-700 dark:text-neutral-300"
                  >
                    + {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Budget amount modal (create + edit) — mounted only while open so
          its state resets on each opening. */}
      {(modal.kind === "set" || modal.kind === "edit") && (
        <BudgetAmountModal
          open
          onClose={() => setModal({ kind: "none" })}
          categoryName={modal.categoryName}
          currency={currency}
          currentAmount={modal.kind === "edit" ? modal.currentAmount : undefined}
          isPending={isPending}
          onConfirm={(amount) => handleSetBudget(modal.categoryId, amount)}
        />
      )}

      {/* Remove confirmation modal */}
      <ConfirmModal
        open={modal.kind === "remove"}
        onClose={() => setModal({ kind: "none" })}
        title="Remove budget"
        message={`Remove the budget for ${modal.kind === "remove" ? modal.categoryName : ""}? Your transactions are not affected.`}
        confirmLabel="Remove"
        isPending={isPending}
        onConfirm={() => {
          if (modal.kind === "remove") handleClearBudget(modal.categoryId);
        }}
      />
    </div>
  );
}

function BudgetRow({
  item,
  currency,
  isPending,
  onEdit,
  onRemove,
}: {
  item: BudgetSummaryItem;
  currency: string;
  isPending: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const barColor = item.isOver
    ? "bg-red-500"
    : item.isNear
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
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
        <span className={`text-xs ${item.isOver ? "text-red-600" : "text-neutral-500 dark:text-neutral-400"}`}>
          {item.isOver
            ? `Over by ${formatMoney((parseFloat(item.spentAmount) - parseFloat(item.limitAmount)).toFixed(2), currency)}`
            : `${item.percentage}% used`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={isPending}
            className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Edit
          </button>
          <button
            onClick={onRemove}
            disabled={isPending}
            className="text-xs font-medium text-neutral-400 hover:text-red-600 hover:underline dark:text-neutral-500 dark:hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
