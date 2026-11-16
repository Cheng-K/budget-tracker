"use client";

import { useState, useTransition } from "react";
import type { Category } from "@prisma/client";
import { createTemplateAction } from "@/lib/actions/recurring";

export function CreateTemplateForm({
  categories,
  currency,
}: {
  categories: Category[];
  currency: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filteredCategories = categories.filter((c) => c.kind === type);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createTemplateAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setShowForm(false);
      }
    });
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:border-neutral-700 dark:bg-neutral-900 px-4 py-4 text-sm font-medium text-neutral-600 dark:text-neutral-300 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
      >
        + Add recurring transaction
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4">
      <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">New recurring transaction</h2>

      {error && (
        <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {/* Type */}
        <div className="grid grid-cols-2 gap-2">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                type === t
                  ? t === "INCOME"
                    ? "bg-emerald-600 text-white"
                    : "bg-red-600 text-white"
                  : "border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800"
              }`}
            >
              {t === "EXPENSE" ? "Expense" : "Income"}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Amount ({currency})</label>
          <input
            name="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            required
            className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Category</label>
          <select
            name="categoryId"
            required
            className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
          >
            <option value="" disabled>Select</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Frequency + Date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Frequency</label>
            <select
              name="frequency"
              defaultValue="MONTHLY"
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Start date</label>
            <input
              name="startDate"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* End date */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            End date <span className="text-neutral-400 dark:text-neutral-500">(optional)</span>
          </label>
          <input
            name="endDate"
            type="date"
            className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Note</label>
          <input
            name="note"
            type="text"
            placeholder="e.g. Netflix subscription"
            className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
          />
        </div>

        {/* Payment method */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Payment method</label>
          <select
            name="paymentMethod"
            defaultValue="OTHER"
            className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
          >
            <option value="CASH">Cash</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="DIGITAL_WALLET">Digital Wallet</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm text-neutral-600 dark:text-neutral-300 transition hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
