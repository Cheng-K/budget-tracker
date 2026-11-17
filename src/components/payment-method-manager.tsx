"use client";

import { useState, useTransition } from "react";
import type { PaymentMethod } from "@prisma/client";
import {
  createPaymentMethodAction,
  renamePaymentMethodAction,
  setPaymentMethodHiddenAction,
  reorderPaymentMethodsAction,
  deletePaymentMethodAction,
} from "@/lib/actions/payment-methods";
import { SortableSettingsList } from "@/components/sortable-settings-list";

export function PaymentMethodManager({ paymentMethods }: { paymentMethods: PaymentMethod[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createPaymentMethodAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleRename(id: string, name: string) {
    startTransition(async () => {
      const result = await renamePaymentMethodAction(id, name);
      if (result?.error) setError(result.error);
    });
  }

  function handleToggleHidden(id: string, isHidden: boolean) {
    startTransition(() => setPaymentMethodHiddenAction(id, isHidden));
  }

  function handleReorder(ids: string[]) {
    startTransition(() => reorderPaymentMethodsAction(ids));
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this payment method?")) return;
    startTransition(async () => {
      const result = await deletePaymentMethodAction(id);
      if (result && !result.ok) {
        setError(
          result.reason === "has_transactions"
            ? "Cannot delete: this payment method has transactions. Hide it instead."
            : result.reason === "has_templates"
              ? "Cannot delete: this payment method is used by recurring transactions. Hide it instead."
              : "Payment method not found."
        );
      }
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <SortableSettingsList
        items={paymentMethods}
        onReorder={handleReorder}
        renderItem={(p) => (
          <PaymentMethodRow
            method={p}
            isPending={isPending}
            onRename={handleRename}
            onToggleHidden={handleToggleHidden}
            onDelete={handleDelete}
          />
        )}
      />

      {/* Add new */}
      <form action={handleCreate} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Add payment method</h3>
        <div className="mt-3 flex gap-2">
          <input
            name="name"
            placeholder="Payment method name"
            required
            maxLength={50}
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function PaymentMethodRow({
  method,
  isPending,
  onRename,
  onToggleHidden,
  onDelete,
}: {
  method: PaymentMethod;
  isPending: boolean;
  onRename: (id: string, name: string) => void;
  onToggleHidden: (id: string, isHidden: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`flex flex-1 items-center gap-2 ${method.isHidden ? "opacity-50" : ""}`}>
      <input
        defaultValue={method.name}
        onBlur={(e) => {
          if (e.target.value !== method.name) {
            onRename(method.id, e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-sm font-medium hover:border-neutral-200 dark:hover:border-neutral-800 focus:border-emerald-500 focus:outline-none"
      />
      <button
        onClick={() => onToggleHidden(method.id, !method.isHidden)}
        disabled={isPending}
        title={method.isHidden ? "Show" : "Hide"}
        className="rounded-lg p-1.5 text-neutral-400 dark:text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-600 dark:hover:text-neutral-300"
      >
        {method.isHidden ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      <button
        onClick={() => onDelete(method.id)}
        disabled={isPending}
        title="Delete"
        className="rounded-lg p-1.5 text-neutral-400 dark:text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
