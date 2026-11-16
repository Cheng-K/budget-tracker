"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface TrendPoint {
  label: string;
  fullLabel: string;
  income: string;
  expenses: string;
  net: string;
}

const LABELS: Record<string, string> = {
  income: "Income",
  expenses: "Expenses",
  net: "Net",
};

const COLORS: Record<string, string> = {
  income: "#10b981",
  expenses: "#ef4444",
  net: "#6366f1",
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
    color?: string;
  }>;
  label?: string;
}

/* Custom tooltip so dark: Tailwind classes work (inline Recharts styles can't). */
function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <p className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color || COLORS[String(entry.dataKey)] }}
          />
          <span className="text-neutral-500 dark:text-neutral-400">
            {LABELS[String(entry.dataKey)] ?? String(entry.dataKey)}
          </span>
          <span className="ml-auto font-medium text-neutral-900 dark:text-neutral-100">
            {Number(entry.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    income: parseFloat(d.income),
    expenses: parseFloat(d.expenses),
    net: parseFloat(d.net),
  }));

  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(value) => LABELS[String(value)] ?? String(value)}
          />
          <Bar dataKey="income" fill="#10b981" radius={[2, 2, 0, 0]} />
          <Bar dataKey="expenses" fill="#ef4444" radius={[2, 2, 0, 0]} />
          <Line
            dataKey="net"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
