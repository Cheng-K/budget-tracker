"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import type { Category } from "@prisma/client";

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = ["q", "type", "categoryId", "amountMin", "amountMax"].some(
    (k) => searchParams.get(k)
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search notes…"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            const timeout = setTimeout(() => updateParam("q", val), 300);
            return () => clearTimeout(timeout);
          }}
          className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            hasFilters
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800"
          }`}
        >
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Type</label>
              <select
                defaultValue={searchParams.get("type") ?? ""}
                onChange={(e) => updateParam("type", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Category</label>
              <select
                defaultValue={searchParams.get("categoryId") ?? ""}
                onChange={(e) => updateParam("categoryId", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Min amount</label>
              <input
                type="number"
                placeholder="0"
                autoComplete="off"
                defaultValue={searchParams.get("amountMin") ?? ""}
                onChange={(e) => updateParam("amountMin", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Max amount</label>
              <input
                type="number"
                placeholder="∞"
                autoComplete="off"
                defaultValue={searchParams.get("amountMax") ?? ""}
                onChange={(e) => updateParam("amountMax", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={() => router.push(pathname)}
              className="mt-3 text-xs font-medium text-emerald-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
