import { startOfMonth, endOfMonth, format } from "date-fns";

export function getMonthRange(monthParam?: string | null) {
  const current = monthParam
    ? new Date(monthParam + "-01T00:00:00Z")
    : startOfMonth(new Date());
  return {
    start: startOfMonth(current),
    end: endOfMonth(current),
    label: format(current, "MMMM yyyy"),
    key: format(current, "yyyy-MM"),
  };
}
