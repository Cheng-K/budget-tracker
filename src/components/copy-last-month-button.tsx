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
      className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 transition hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800 disabled:opacity-60"
    >
      {isPending ? "Copying…" : "Copy last month"}
    </button>
  );
}
