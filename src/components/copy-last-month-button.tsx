"use client";

import { useTransition } from "react";
import { copyLastMonthBudgetsAction } from "@/lib/actions/budgets";

export function CopyLastMonthButton({ month }: { month: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Copy last month's budgets to this month?")) {
          startTransition(() => copyLastMonthBudgetsAction(month));
        }
      }}
      disabled={isPending}
      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-60"
    >
      {isPending ? "Copying…" : "Copy last month"}
    </button>
  );
}
