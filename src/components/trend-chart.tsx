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
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#888" }}
            tickLine={false}
            axisLine={{ stroke: "#e0e0e0" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#888" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              fontSize: "12px",
            }}
            formatter={(value, name) => [
              Number(value).toFixed(2),
              name === "income" ? "Income" : name === "expenses" ? "Expenses" : "Net",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(value) =>
              value === "income" ? "Income" : value === "expenses" ? "Expenses" : "Net"
            }
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
