"use client";

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface LineConfig {
  key: string;
  color: string;
  name: string;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: LineConfig[];
  height?: number;
}

export function KpiLineChart({ data, xKey, lines, height = 300 }: LineChartProps) {
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
        />
        <Legend
          wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
