"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { formatMoney } from "@/lib/money";
import {
  toggleTemplateAction,
  deleteTemplateAction,
  materializeNowAction,
} from "@/lib/actions/recurring";
import type { Category, RecurringTemplate } from "@prisma/client";

type TemplateWithRelations = RecurringTemplate & {
  category: Category;
  lastOccurrence: { occurrenceDate: Date; transactionId: string | null } | null;
};

export function RecurringList({
  templates,
  currency,
}: {
  templates: TemplateWithRelations[];
  currency: string;
}) {
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:border-neutral-700 dark:bg-neutral-900 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">No recurring transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Templates</h2>
        <button
          onClick={() => startTransition(() => materializeNowAction())}
          disabled={isPending}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 transition hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800 disabled:opacity-60"
        >
          {isPending ? "Running…" : "Run due now"}
        </button>
      </div>

      {templates.map((t) => {
        const lastOcc = t.lastOccurrence;
        const nextDate = getNextDate(t);

        return (
          <div
            key={t.id}
            className={`rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4 ${!t.isActive ? "opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{t.category.name}</span>
                <span className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">
                  {t.frequency.toLowerCase()}
                </span>
              </div>
              <span
                className={`text-sm font-medium ${
                  t.type === "INCOME" ? "text-emerald-600" : "text-neutral-900 dark:text-neutral-100"
                }`}
              >
                {t.type === "INCOME" ? "+" : "−"}
                {formatMoney(t.amount, t.currencyCode || currency)}
              </span>
            </div>

            {t.note && (
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{t.note}</p>
            )}

            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                {nextDate ? (
                  <span>Next: {format(nextDate, "MMM d, yyyy")}</span>
                ) : (
                  <span className="text-neutral-400 dark:text-neutral-500">Ended</span>
                )}
                {lastOcc?.transactionId && (
                  <span className="ml-2 text-neutral-400 dark:text-neutral-500">
                    Last: {format(lastOcc.occurrenceDate, "MMM d")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    startTransition(() => toggleTemplateAction(t.id, !t.isActive))
                  }
                  disabled={isPending}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    t.isActive
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 dark:text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {t.isActive ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this recurring template? Existing transactions are kept.")) {
                      startTransition(() => deleteTemplateAction(t.id));
                    }
                  }}
                  disabled={isPending}
                  className="rounded-lg p-1.5 text-neutral-400 dark:text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getNextDate(t: RecurringTemplate): Date | null {
  const now = new Date();
  if (!t.isActive) return null;
  if (t.endDate && t.endDate < now) return null;

  // Simple next-date estimate: start from today and find the next occurrence.
  const start = new Date(t.startDate);
  if (start > now) return start;

  // For display purposes, compute the next occurrence after today.
  const diffMs = now.getTime() - start.getTime();
  if (t.frequency === "WEEKLY") {
    const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const next = new Date(start.getTime() + (weeks + 1) * 7 * 24 * 60 * 60 * 1000);
    return t.endDate && next > t.endDate ? null : next;
  }
  if (t.frequency === "MONTHLY") {
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    const next = new Date(start);
    next.setMonth(next.getMonth() + months + 1);
    return t.endDate && next > t.endDate ? null : next;
  }
  const years = now.getFullYear() - start.getFullYear();
  const next = new Date(start);
  next.setFullYear(next.getFullYear() + years + 1);
  return t.endDate && next > t.endDate ? null : next;
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
