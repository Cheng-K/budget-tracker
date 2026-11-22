import { sumDecimals, toDecimal } from "@/lib/money";

export interface CategoryPieItem {
  categoryId: string;
  name: string;
  amount: string;
  count: number;
  budget: string | null;
}

export interface CategoryPieSlice {
  /** categoryId, or OTHER_SLICE_KEY for the grouped tail. */
  key: string;
  name: string;
  /** Numeric amount for the chart. */
  value: number;
  /** Share of total expenses, 0–100. */
  pct: number;
  count: number;
  budget: string | null;
  /** Categories folded into this slice; empty unless key === OTHER_SLICE_KEY. */
  grouped: CategoryPieItem[];
}

export const OTHER_SLICE_KEY = "other";
export const MAX_PIE_SLICES = 7;

/**
 * Top-N slices by amount plus an "Other" slice aggregating the tail.
 * Amounts are summed with Decimal so grouping never introduces float drift.
 */
export function buildCategoryPie(
  items: CategoryPieItem[],
  totalExpenses: string
): CategoryPieSlice[] {
  const total = toDecimal(totalExpenses);
  if (items.length === 0 || total.lte(0)) return [];

  const sorted = [...items].sort((a, b) =>
    toDecimal(b.amount).cmp(toDecimal(a.amount))
  );
  const head = sorted.slice(0, MAX_PIE_SLICES);
  const tail = sorted.slice(MAX_PIE_SLICES);

  const slices: CategoryPieSlice[] = head.map((item) => {
    const amount = toDecimal(item.amount);
    return {
      key: item.categoryId,
      name: item.name,
      value: amount.toNumber(),
      pct: amount.div(total).mul(100).toNumber(),
      count: item.count,
      budget: item.budget,
      grouped: [],
    };
  });

  if (tail.length > 0) {
    const amount = sumDecimals(tail.map((i) => i.amount));
    slices.push({
      key: OTHER_SLICE_KEY,
      name: "Other",
      value: amount.toNumber(),
      pct: amount.div(total).mul(100).toNumber(),
      count: tail.reduce((n, i) => n + i.count, 0),
      budget: null,
      grouped: tail,
    });
  }

  return slices;
}
