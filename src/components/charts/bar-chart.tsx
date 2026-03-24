"use client";

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface BarConfig {
  key: string;
  color: string;
  name: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: BarConfig[];
  height?: number;
  stacked?: boolean;
}

export function KpiBarChart({
  data,
  xKey,
  bars,
  height = 300,
  stacked = false,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        Keine Daten
      </div>
    );
  }

  const stackId = stacked ? "stack" : undefined;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#d1d5db" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#d1d5db" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: 13,
          }}
          cursor={{ fill: "rgba(107, 114, 128, 0.06)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color}
            stackId={stackId}
            radius={stacked ? 0 : [4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
