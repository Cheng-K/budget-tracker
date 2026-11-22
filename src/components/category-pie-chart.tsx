"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
} from "recharts";
import { formatMoney, toDecimal, subtractDecimals } from "@/lib/money";
import {
  buildCategoryPie,
  OTHER_SLICE_KEY,
  type CategoryPieItem,
  type CategoryPieSlice,
} from "@/lib/category-pie";

/* Validated against light and dark surfaces; legend labels are the
   secondary encoding where colorblind simulations flag adjacent hues. */
const SLICE_COLORS = [
  "#2563eb",
  "#ea580c",
  "#16a34a",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#ca8a04",
];
const OTHER_COLORS = { light: "#737373", dark: "#a3a3a3" };

function formatPct(pct: number): string {
  return `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

function transactionsHref(monthKey: string, categoryId: string): string {
  return `/transactions?${new URLSearchParams({
    month: monthKey,
    categoryId,
    type: "EXPENSE",
  }).toString()}`;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: CategoryPieSlice }>;
  currency: string;
}

/* Custom tooltip so dark: Tailwind classes work (inline Recharts styles can't). */
function PieTooltip({ active, payload, currency }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  if (!slice) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <p className="font-medium text-neutral-900 dark:text-neutral-100">{slice.name}</p>
      <p className="mt-1 text-neutral-500 dark:text-neutral-400">
        {formatMoney(slice.value, currency)} · {formatPct(slice.pct)} ·{" "}
        {slice.count} {slice.count === 1 ? "transaction" : "transactions"}
      </p>
    </div>
  );
}

function BudgetLine({
  amount,
  budget,
  currency,
}: {
  amount: string | number;
  budget: string;
  currency: string;
}) {
  const over = toDecimal(amount).gt(toDecimal(budget));
  return (
    <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
      Budget: {formatMoney(budget, currency)}
      {over && (
        <span className="ml-1 text-red-500">
          (over by {formatMoney(subtractDecimals(amount, budget), currency)})
        </span>
      )}
    </p>
  );
}

export function CategoryPieChart({
  items,
  currency,
  totalExpenses,
  monthKey,
}: {
  items: CategoryPieItem[];
  currency: string;
  totalExpenses: string;
  monthKey: string;
}) {
  const { resolvedTheme } = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const slices = useMemo(
    () => buildCategoryPie(items, totalExpenses),
    [items, totalExpenses]
  );

  if (slices.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No expenses this month.</p>
      </div>
    );
  }

  const total = toDecimal(totalExpenses);
  const selected = slices.find((s) => s.key === selectedKey) ?? null;

  const colorFor = (slice: CategoryPieSlice, index: number) =>
    slice.key === OTHER_SLICE_KEY
      ? OTHER_COLORS[resolvedTheme === "dark" ? "dark" : "light"]
      : SLICE_COLORS[index % SLICE_COLORS.length];

  const toggle = (key: string) =>
    setSelectedKey((cur) => (cur === key ? null : key));

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div
        className="relative"
        role="img"
        aria-label="Donut chart of spending by category"
      >
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="82%"
              paddingAngle={2}
              cornerRadius={4}
              stroke="var(--surface)"
              strokeWidth={2}
              onClick={(entry) => {
                const key = entry.payload?.key;
                if (typeof key === "string") toggle(key);
              }}
              shape={({ key, ...props }) => (
                <Sector
                  key={key}
                  {...props}
                  outerRadius={
                    props.outerRadius +
                    (props.payload?.key === selectedKey ? 6 : 0)
                  }
                />
              )}
            >
              {slices.map((slice, i) => (
                <Cell
                  key={slice.key}
                  fill={colorFor(slice, i)}
                  fillOpacity={
                    selected && selected.key !== slice.key ? 0.45 : 1
                  }
                  className="cursor-pointer"
                />
              ))}
            </Pie>
            {/* zIndex lifts the tooltip above the absolutely-positioned center label. */}
            <Tooltip content={<PieTooltip currency={currency} />} wrapperStyle={{ zIndex: 20 }} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label, constrained to the donut hole so long names wrap. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-[45%] text-center">
            {selected ? (
              <>
                <p className="break-words text-xs text-neutral-500 dark:text-neutral-400">
                  {selected.name}
                </p>
                <p className="mt-0.5 break-words text-base font-semibold tabular-nums">
                  {formatMoney(selected.value, currency)}
                </p>
                <p className="text-xs text-neutral-400 tabular-nums dark:text-neutral-500">
                  {formatPct(selected.pct)}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Total spent</p>
                <p className="mt-0.5 break-words text-base font-semibold tabular-nums">
                  {formatMoney(totalExpenses, currency)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <ul className="mt-2 flex flex-col">
        {slices.map((slice, i) => (
          <li key={slice.key}>
            <button
              type="button"
              onClick={() => toggle(slice.key)}
              aria-pressed={selectedKey === slice.key}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                selectedKey === slice.key ? "bg-neutral-50 dark:bg-neutral-800" : ""
              }`}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorFor(slice, i) }}
              />
              <span className="min-w-0 flex-1 break-words font-medium">{slice.name}</span>
              <span className="shrink-0 tabular-nums">{formatMoney(slice.value, currency)}</span>
              <span className="w-12 shrink-0 text-right text-xs text-neutral-400 tabular-nums dark:text-neutral-500">
                {formatPct(slice.pct)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div
          aria-live="polite"
          className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800"
        >
          {selected.key === OTHER_SLICE_KEY ? (
            <>
              <p className="text-sm font-medium">Other categories</p>
              <ul className="mt-2 flex flex-col gap-3">
                {selected.grouped.map((g) => (
                  <li key={g.categoryId} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href={transactionsHref(monthKey, g.categoryId)}
                        className="min-w-0 break-words font-medium underline-offset-2 hover:underline"
                      >
                        {g.name}
                      </Link>
                      <span className="shrink-0 tabular-nums">
                        {formatMoney(g.amount, currency)} ·{" "}
                        {formatPct(toDecimal(g.amount).div(total).mul(100).toNumber())}
                      </span>
                    </div>
                    {g.budget && (
                      <BudgetLine amount={g.amount} budget={g.budget} currency={currency} />
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-medium">{selected.name}</p>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(selected.value, currency)}
                </p>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {formatPct(selected.pct)} of spending · {selected.count}{" "}
                {selected.count === 1 ? "transaction" : "transactions"}
              </p>
              {selected.budget && (
                <BudgetLine amount={selected.value} budget={selected.budget} currency={currency} />
              )}
              <Link
                href={transactionsHref(monthKey, selected.key)}
                className="mt-3 inline-block text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
              >
                View transactions →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
