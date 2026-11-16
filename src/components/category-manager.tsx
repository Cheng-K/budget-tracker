"use client";

import { useState, useTransition } from "react";
import type { Category } from "@prisma/client";
import {
  createCategoryAction,
  renameCategoryAction,
  setCategoryHiddenAction,
  deleteCategoryAction,
} from "@/lib/actions/categories";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.kind === "INCOME");

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCategoryAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleRename(id: string, name: string) {
    startTransition(async () => {
      const result = await renameCategoryAction(id, name);
      if (result?.error) setError(result.error);
    });
  }

  function handleToggleHidden(id: string, isHidden: boolean) {
    startTransition(() => setCategoryHiddenAction(id, isHidden));
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (result && !result.ok) {
        setError(
          result.reason === "has_transactions"
            ? "Cannot delete: this category has transactions. Hide it instead."
            : "Category not found."
        );
      }
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <CategoryGroup
        title="Expense categories"
        categories={expenseCategories}
        onRename={handleRename}
        onToggleHidden={handleToggleHidden}
        onDelete={handleDelete}
        isPending={isPending}
      />

      <CategoryGroup
        title="Income categories"
        categories={incomeCategories}
        onRename={handleRename}
        onToggleHidden={handleToggleHidden}
        onDelete={handleDelete}
        isPending={isPending}
      />

      {/* Add new */}
      <form action={handleCreate} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Add category</h3>
        <div className="mt-3 flex gap-2">
          <input
            name="name"
            placeholder="Category name"
            required
            maxLength={50}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <select
            name="kind"
            defaultValue="EXPENSE"
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function CategoryGroup({
  title,
  categories,
  onRename,
  onToggleHidden,
  onDelete,
  isPending,
}: {
  title: string;
  categories: Category[];
  onRename: (id: string, name: string) => void;
  onToggleHidden: (id: string, isHidden: boolean) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {title}
      </h3>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {categories.map((c) => (
          <li key={c.id} className={`flex items-center gap-2 px-4 py-2.5 ${c.isHidden ? "opacity-50" : ""}`}>
            <input
              defaultValue={c.name}
              onBlur={(e) => {
                if (e.target.value !== c.name) {
                  onRename(c.id, e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-sm font-medium hover:border-neutral-200 dark:border-neutral-800 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={() => onToggleHidden(c.id, !c.isHidden)}
              disabled={isPending}
              title={c.isHidden ? "Show" : "Hide"}
              className="rounded-lg p-1.5 text-neutral-400 dark:text-neutral-500 transition hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-800 hover:text-neutral-600 dark:text-neutral-300"
            >
              {c.isHidden ? (
                <EyeOffIcon />
              ) : (
                <EyeIcon />
              )}
            </button>
            <button
              onClick={() => onDelete(c.id)}
              disabled={isPending}
              title="Delete"
              className="rounded-lg p-1.5 text-neutral-400 dark:text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
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
