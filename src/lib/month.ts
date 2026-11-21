/**
 * Month range helpers — all UTC-based to match the Date-only (`@db.Date`)
 * Prisma column, which normalizes to UTC. date-fns `startOfMonth`/`endOfMonth`
 * use the local timezone and will silently shift the month boundary on
 * non-UTC servers, so we compute month bounds in UTC here instead.
 */
export function getMonthRange(monthParam?: string | null) {
  // Parse "YYYY-MM" or default to the current month (UTC). Month 13+
  // would roll the Date over while leaving a bogus key, so reject it here.
  let year: number, month: number;
  if (monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
    year = parseInt(monthParam.slice(0, 4), 10);
    month = parseInt(monthParam.slice(5, 7), 10) - 1; // 0-based
  } else {
    const now = new Date();
    year = now.getUTCFullYear();
    month = now.getUTCMonth();
  }

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0)); // last day of month

  const pad = (n: number) => String(n).padStart(2, "0");
  const key = `${year}-${pad(month + 1)}`;
  const label = new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return { start, end, key, label };
}

/** Compute the previous month in UTC. */
export function getPrevMonth(month: Date): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1));
}

/** Compute the next month in UTC. */
export function getNextMonth(month: Date): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
}

/** UTC month start (1st of month at 00:00 UTC). */
export function utcMonthStart(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1));
}

/** UTC month end (last day of month at 00:00 UTC). */
export function utcMonthEnd(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}
