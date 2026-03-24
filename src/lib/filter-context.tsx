"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

type TimeRangePreset =
  | "this-month"
  | "last-4-weeks"
  | "this-quarter"
  | "last-quarter"
  | "this-year"
  | "last-year"
  | "custom";

type ViewMode = "week" | "month";

interface FilterState {
  timeRange: TimeRangePreset;
  customFrom: string;
  customTo: string;
  viewMode: ViewMode;
  costCenter: string;
}

interface FilterContextValue extends FilterState {
  setTimeRange: (v: TimeRangePreset) => void;
  setCustomFrom: (v: string) => void;
  setCustomTo: (v: string) => void;
  setViewMode: (v: ViewMode) => void;
  setCostCenter: (v: string) => void;
  dateRange: { from: string; to: string };
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function computeDateRange(preset: TimeRangePreset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "this-month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toISODate(from), to: toISODate(today) };
    }
    case "last-4-weeks": {
      const from = new Date(today);
      from.setDate(from.getDate() - 28);
      return { from: toISODate(from), to: toISODate(today) };
    }
    case "this-quarter": {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      const from = new Date(today.getFullYear(), qMonth, 1);
      return { from: toISODate(from), to: toISODate(today) };
    }
    case "last-quarter": {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      const from = new Date(today.getFullYear(), qMonth - 3, 1);
      const to = new Date(today.getFullYear(), qMonth, 0);
      return { from: toISODate(from), to: toISODate(to) };
    }
    case "this-year": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from: toISODate(from), to: toISODate(today) };
    }
    case "last-year": {
      const from = new Date(today.getFullYear() - 1, 0, 1);
      const to = new Date(today.getFullYear() - 1, 11, 31);
      return { from: toISODate(from), to: toISODate(to) };
    }
    default:
      return { from: toISODate(today), to: toISODate(today) };
  }
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRangePreset>("this-month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [costCenter, setCostCenter] = useState("all");

  const dateRange = useMemo(() => {
    if (timeRange === "custom") return { from: customFrom, to: customTo };
    return computeDateRange(timeRange);
  }, [timeRange, customFrom, customTo]);

  const value: FilterContextValue = {
    timeRange,
    customFrom,
    customTo,
    viewMode,
    costCenter,
    setTimeRange,
    setCustomFrom,
    setCustomTo,
    setViewMode,
    setCostCenter,
    dateRange,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

// Re-export types for consumers
export type { TimeRangePreset, ViewMode };

// Re-export constants
export const TIME_RANGE_LABELS: Record<TimeRangePreset, string> = {
  "this-month": "Dieser Monat",
  "last-4-weeks": "Letzte 4 Wochen",
  "this-quarter": "Dieses Quartal",
  "last-quarter": "Letztes Quartal",
  "this-year": "Dieses Jahr",
  "last-year": "Letztes Jahr",
  custom: "Benutzerdefiniert",
};
