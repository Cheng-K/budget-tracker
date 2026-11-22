"use client";

import { useTransition, useState } from "react";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/lib/actions/transactions";
import { ReceiptUpload } from "@/components/receipt-upload";
import { AmountInput } from "@/components/amount-input";
import type { Category, PaymentMethod } from "@prisma/client";
import type { SerializedTransaction } from "@/lib/queries/transactions";

interface TransactionFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  defaultCurrency: string;
  transaction?: SerializedTransaction; // present => edit mode
}

export function TransactionForm({
  categories,
  paymentMethods,
  defaultCurrency,
  transaction,
}: TransactionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"EXPENSE" | "INCOME">(
    (transaction?.type as "EXPENSE" | "INCOME") ?? "EXPENSE"
  );
  const [error, setError] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string>(
    transaction?.receipt?.id ?? ""
  );

  const isEdit = !!transaction;
  // Hidden rows stay in the option set when they're the current value,
  // so editing an existing transaction never loses its selection.
  const filteredCategories = categories.filter(
    (c) => c.kind === type && (!c.isHidden || c.id === transaction?.categoryId)
  );
  const visiblePaymentMethods = paymentMethods.filter(
    (p) => !p.isHidden || p.id === transaction?.paymentMethodId
  );
  const defaultPaymentMethodId =
    transaction?.paymentMethodId ??
    visiblePaymentMethods.find((p) => p.name === "Other")?.id ??
    visiblePaymentMethods[0]?.id ??
    "";

  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = transaction
    ? transaction.date.toISOString().slice(0, 10)
    : today;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (isEdit) {
          const result = await updateTransactionAction(transaction.id, formData);
          if (result?.error) setError(result.error);
        } else {
          const result = await createTransactionAction(formData);
          if (result?.error) setError(result.error);
        }
      } catch {
        // redirect() throws internally — let it propagate.
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              type === t
                ? t === "INCOME"
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
                : "border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800"
            }`}
          >
            {t === "EXPENSE" ? "Expense" : "Income"}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      {/* Amount */}
      <AmountInput
        name="amount"
        label={`Amount (${defaultCurrency})`}
        currency={defaultCurrency}
        defaultValue={transaction ? String(transaction.amount) : ""}
        required
        autoFocus
      />

      {/* Category */}
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={transaction?.categoryId ?? ""}
          required
          className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="" disabled>
            Select a category
          </option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={defaultDate}
          required
          className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Note */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Note / merchant <span className="text-neutral-400 dark:text-neutral-500">(optional)</span>
        </label>
        <input
          id="note"
          name="note"
          type="text"
          placeholder="e.g. Coffee at Starbucks"
          defaultValue={transaction?.note ?? ""}
          maxLength={500}
          className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Payment method */}
      <div>
        <label htmlFor="paymentMethodId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Payment method
        </label>
        {visiblePaymentMethods.length === 0 ? (
          <>
            <select
              id="paymentMethodId"
              disabled
              className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-neutral-400 dark:text-neutral-500 focus:outline-none"
            >
              <option>No payment methods</option>
            </select>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Add a payment method in Settings.
            </p>
          </>
        ) : (
          <select
            id="paymentMethodId"
            name="paymentMethodId"
            defaultValue={defaultPaymentMethodId}
            className="mt-1 block w-full rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {visiblePaymentMethods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Location label */}
      <div>
        <label htmlFor="locationLabel" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Location <span className="text-neutral-400 dark:text-neutral-500">(optional)</span>
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="locationLabel"
            name="locationLabel"
            type="text"
            placeholder="e.g. Main Street"
            defaultValue={transaction?.locationLabel ?? ""}
            maxLength={200}
            className="block flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition((pos) => {
                const form = (document.getElementById("locationLabel") as HTMLElement)?.closest("form");
                if (!form) return;
                (form.elements.namedItem("lat") as HTMLInputElement).value =
                  pos.coords.latitude.toFixed(6);
                (form.elements.namedItem("lng") as HTMLInputElement).value =
                  pos.coords.longitude.toFixed(6);
                (document.getElementById("gps-status") as HTMLElement).textContent =
                  "GPS captured ✓";
              });
            }}
            className="shrink-0 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 transition hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800"
          >
            GPS
          </button>
        </div>
        <p id="gps-status" className="mt-1 text-xs text-emerald-600">
          {transaction?.lat && transaction?.lng ? "GPS captured ✓" : ""}
        </p>
        <input type="hidden" name="lat" defaultValue={transaction?.lat ? String(transaction.lat) : ""} />
        <input type="hidden" name="lng" defaultValue={transaction?.lng ? String(transaction.lng) : ""} />
      </div>

      <ReceiptUpload
        currentReceiptId={transaction?.receipt?.id ?? null}
        onUploaded={setReceiptId}
      />
      <input type="hidden" name="receiptId" value={receiptId} />

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Saving…
          </span>
        ) : isEdit ? (
          "Save changes"
        ) : (
          "Add transaction"
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
