"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { addMonths, format, startOfMonth } from "date-fns";

export function MonthSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const monthParam = searchParams.get("month");
  const current = monthParam
    ? new Date(monthParam + "-01T00:00:00Z")
    : startOfMonth(new Date());

  function go(delta: number) {
    const next = addMonths(current, delta);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", format(next, "yyyy-MM"));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => go(-1)}
        aria-label="Previous month"
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="text-sm font-medium">
        {format(current, "MMMM yyyy")}
      </span>
      <button
        onClick={() => go(1)}
        aria-label="Next month"
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
