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
  /** "week" → DD.MM., "month" → MM/YY, undefined → pass-through */
  dateFormat?: "week" | "month";
}

function formatDateLabel(value: string, fmt?: "week" | "month"): string {
  if (!fmt || !value) return value;
  if (value.includes("-")) {
    const parts = value.split("-");
    const dd = parts[2] || "01";
    const mm = parts[1] || "01";
    const yy = (parts[0] || "").slice(2);
    if (fmt === "month") return `${mm}/${yy}`;
    return `${dd}.${mm}.`;
  }
  return value;
}

function formatTooltipDate(value: string, fmt?: "week" | "month"): string {
  if (!fmt || !value) return value;
  if (value.includes("-")) {
    const parts = value.split("-");
    const dd = parts[2] || "01";
    const mm = parts[1] || "01";
    const yyyy = parts[0] || "";
    if (fmt === "month") return `${mm}/${yyyy}`;
    return `${dd}.${mm}.${yyyy}`;
  }
  return value;
}

/**
 * Trim trailing data points where ALL line keys are 0 (unfilled future weeks).
 * Replaces zeros in those trailing rows with null so the line simply ends.
 */
function trimTrailingZeros(
  data: Record<string, unknown>[],
  lineKeys: string[],
): Record<string, unknown>[] {
  let lastNonZero = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (lineKeys.some((k) => (data[i][k] as number) > 0)) {
      lastNonZero = i;
      break;
    }
  }
  if (lastNonZero === -1) return data;

  return data.map((row, i) => {
    if (i <= lastNonZero) return row;
    const patched: Record<string, unknown> = { ...row };
    for (const k of lineKeys) patched[k] = null;
    return patched;
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Custom XAxis tick that shows a small amber dot when comments exist */
function CommentAwareTick(props: any) {
  const { x, y, payload, visibleTicksCount } = props;
  // Access the chart data from the payload index
  const chartData: Record<string, unknown>[] | undefined = props.chartData;
  const dataPoint = chartData?.[payload.index];
  const comments = dataPoint?._comments as string[] | undefined;
  const hasComment = comments && comments.length > 0;
  const dateFormat = props.dateFormat as "week" | "month" | undefined;

  // Hide some ticks if too many
  const showLabel = !visibleTicksCount || visibleTicksCount < 20 || payload.index % 2 === 0;

  return (
    <g transform={`translate(${x},${y})`}>
      {showLabel && (
        <text x={0} y={0} dy={12} textAnchor="middle" fill="#94a3b8" fontSize={10}>
          {formatDateLabel(String(payload.value), dateFormat)}
        </text>
      )}
      {hasComment && (
        <circle cx={0} cy={showLabel ? 24 : 12} r={3} fill="#f59e0b" stroke="#fbbf24" strokeWidth={1} />
      )}
    </g>
  );
}

/** Custom tooltip that shows comments if available */
function CustomTooltipContent(props: any) {
  const { active, payload, label, dateFormat } = props;
  if (!active || !payload?.length) return null;

  const dataPoint = payload[0]?.payload;
  const comments = dataPoint?._comments as string[] | undefined;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        fontSize: 11,
        padding: "8px 12px",
        maxWidth: 320,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4, color: "#374151" }}>
        {formatTooltipDate(String(label), dateFormat)}
      </p>
      {payload.map((entry: any, i: number) => {
        if (entry.value == null) return null;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0 }} />
            <span style={{ color: "#6b7280" }}>{entry.name}:</span>
            <span style={{ fontWeight: 600, color: "#111827" }}>
              {typeof entry.value === "number" ? entry.value.toLocaleString("de-DE") : String(entry.value)}
            </span>
          </div>
        );
      })}
      {comments && comments.length > 0 && (
        <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="#f59e0b">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <span style={{ fontWeight: 600, color: "#92400e", fontSize: 10 }}>Kommentare</span>
          </div>
          {comments.map((c: string, i: number) => (
            <p key={i} style={{ color: "#78716c", fontSize: 10, marginBottom: 2, lineHeight: 1.4 }}>
              {c}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export function KpiLineChart({ data, xKey, lines, height = 240, dateFormat }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-gray-300" style={{ height }}>
        Keine Daten vorhanden
      </div>
    );
  }

  const lineKeys = lines.map((l) => l.key);
  const trimmedData = trimTrailingZeros(data, lineKeys);
  const hasAnyComments = trimmedData.some((d) => {
    const c = d._comments as string[] | undefined;
    return c && c.length > 0;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={trimmedData} margin={{ top: 4, right: 8, left: -12, bottom: hasAnyComments ? 16 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={hasAnyComments
            ? <CommentAwareTick chartData={trimmedData} dateFormat={dateFormat} />
            : { fontSize: 10, fill: "#94a3b8" }
          }
          tickFormatter={hasAnyComments ? undefined : (v) => formatDateLabel(String(v), dateFormat)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip content={<CustomTooltipContent dateFormat={dateFormat} />} />
        <Legend
          wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
          iconSize={8}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 2, fill: "#fff" }}
            connectNulls={false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
