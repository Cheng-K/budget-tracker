"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getMonthRange, getPrevMonth, getNextMonth } from "@/lib/month";

export function MonthSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const monthParam = searchParams.get("month");
  const { start: current, label } = getMonthRange(monthParam);

  function go(delta: -1 | 1) {
    const next = delta === -1 ? getPrevMonth(current) : getNextMonth(current);
    const y = next.getUTCFullYear();
    const m = String(next.getUTCMonth() + 1).padStart(2, "0");
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", `${y}-${m}`);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => go(-1)}
        aria-label="Previous month"
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="text-sm font-medium">{label}</span>
      <button
        onClick={() => go(1)}
        aria-label="Next month"
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
