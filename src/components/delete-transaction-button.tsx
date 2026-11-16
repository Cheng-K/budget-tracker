"use client";

import { useTransition } from "react";
import { deleteTransactionAction } from "@/lib/actions/transactions";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Delete this transaction?")) {
          startTransition(() => deleteTransactionAction(id));
        }
      }}
      disabled={isPending}
      className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-center text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
