"use client";

import React from "react";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down";
  subtitle?: string;
  accent?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend,
  subtitle,
  accent = "from-blue-500 to-blue-600",
  className = "",
}: StatCardProps) {
  const showTrend = trend !== undefined || change !== undefined;
  const isPositive = trend === "up" || (change !== undefined && change >= 0);

  return (
    <div
      className={`
        group relative bg-white rounded-xl shadow-card hover:shadow-card-hover
        border border-gray-100 p-4 transition-all duration-200
        overflow-hidden
        ${className}
      `}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent}`} />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        {showTrend && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
              isPositive
                ? "text-emerald-700 bg-emerald-50"
                : "text-red-700 bg-red-50"
            }`}
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              {isPositive ? (
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
              )}
            </svg>
            {change !== undefined && (
              <>{change >= 0 ? "+" : ""}{change}%</>
            )}
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight">{value}</p>

      {subtitle && (
        <p className="text-[11px] text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
