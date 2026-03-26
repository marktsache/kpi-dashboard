"use client";

import React from "react";
import { useFilters, TIME_RANGE_LABELS } from "@/lib/filter-context";

interface FilterBarProps {
  showViewMode?: boolean;
  showEmployeeFilter?: boolean;
  showExport?: boolean;
  employees?: Array<{ id: string; name: string; costCenter: string }>;
  selectedEmployee?: string;
  onEmployeeChange?: (id: string) => void;
  onExport?: () => void;
  exporting?: boolean;
  entryCount?: number;
  className?: string;
}

function formatDE(d: string): string {
  return new Date(d).toLocaleDateString("de-DE");
}

export function FilterBar({
  showViewMode = false,
  showEmployeeFilter = false,
  showExport = false,
  employees = [],
  selectedEmployee = "all",
  onEmployeeChange,
  onExport,
  exporting = false,
  entryCount,
  className = "",
}: FilterBarProps) {
  const {
    timeRange, setTimeRange,
    customFrom, setCustomFrom, customTo, setCustomTo,
    viewMode, setViewMode,
    costCenter, setCostCenter,
    dateRange,
  } = useFilters();

  const selectClass = "bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-gray-600";

  return (
    <div className={`flex flex-wrap items-center gap-2 mb-6 ${className}`}>
      <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as typeof timeRange)} className={selectClass}>
        {Object.entries(TIME_RANGE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {timeRange === "custom" && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className={selectClass} />
          <span className="text-[11px] text-gray-400">bis</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className={selectClass} />
        </div>
      )}

      {dateRange.from && dateRange.to && (
        <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-500">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDE(dateRange.from)} – {formatDE(dateRange.to)}
        </span>
      )}

      {showViewMode && (
        <div className="flex bg-white rounded-lg border border-gray-200 shadow-card overflow-hidden">
          {(["week", "month"] as const).map((vm) => (
            <button
              key={vm}
              onClick={() => setViewMode(vm)}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${
                viewMode === vm
                  ? "bg-navy-800 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {vm === "week" ? "je Woche" : "je Monat"}
            </button>
          ))}
        </div>
      )}

      <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className={selectClass}>
        <option value="all">Alle Kostenstellen</option>
        <option value="330">KST 330</option>
        <option value="350">KST 350</option>
        <option value="370">KST 370</option>
      </select>

      {showEmployeeFilter && onEmployeeChange && (
        <select value={selectedEmployee} onChange={(e) => onEmployeeChange(e.target.value)} className={selectClass}>
          <option value="all">Alle Mitarbeiter</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name} (KST {emp.costCenter})</option>
          ))}
        </select>
      )}

      {(showExport || entryCount !== undefined) && (
        <div className="ml-auto flex items-center gap-2">
          {entryCount !== undefined && (
            <span className="text-[10px] text-gray-300">{entryCount} Einträge</span>
          )}
          {showExport && onExport && (
            <button
              onClick={onExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-card hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
          )}
        </div>
      )}
    </div>
  );
}
