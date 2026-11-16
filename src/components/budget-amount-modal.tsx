"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/modal";
import { AmountInput } from "@/components/amount-input";

interface BudgetAmountModalProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  currency: string;
  currentAmount?: string; // set when editing, blank when creating
  onConfirm: (amount: string) => void;
  isPending?: boolean;
}

export function BudgetAmountModal({
  open,
  onClose,
  categoryName,
  currency,
  currentAmount,
  onConfirm,
  isPending,
}: BudgetAmountModalProps) {
  const [amount, setAmount] = useState(currentAmount ?? "");
  const [error, setError] = useState<string | null>(null);

  // Reset when opening.
  useEffect(() => {
    if (open) {
      setAmount(currentAmount ?? "");
      setError(null);
    }
  }, [open, currentAmount]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (amount === "" || isNaN(parsed)) {
      setError("Enter a valid amount");
      return;
    }
    if (parsed === 0 && !currentAmount) {
      setError("Amount must be greater than zero");
      return;
    }
    onConfirm(amount);
  }

  return (
    <Modal open={open} onClose={onClose} title={currentAmount ? "Edit budget" : "Set budget"}>
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Monthly budget for <span className="font-medium text-neutral-900 dark:text-neutral-100">{categoryName}</span>
        </p>

        <div className="mt-3">
          <AmountInput
            name="budget-limit"
            label={`Amount (${currency})`}
            currency={currency}
            defaultValue={currentAmount}
            autoFocus
            onValueChange={(val) => {
              setAmount(val);
              setError(null);
            }}
          />
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            Type digits to enter cents first — e.g. 5558 → 55.58
          </p>
          {error && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {isPending ? "Saving…" : currentAmount ? "Save" : "Set budget"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
