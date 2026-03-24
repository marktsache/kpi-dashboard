"use client";

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface PieDataItem {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieDataItem[];
  height?: number;
  donut?: boolean;
}

export function KpiPieChart({ data, height = 300, donut = true }: PieChartProps) {
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

  const innerRadius = donut ? "55%" : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="80%"
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: 13,
          }}
          formatter={(value) => typeof value === "number" ? value.toLocaleString("de-DE") : String(value)}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
          formatter={(value: string) => (
            <span className="text-gray-600">{value}</span>
          )}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
