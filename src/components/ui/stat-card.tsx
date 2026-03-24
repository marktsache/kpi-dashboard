"use client";

import React from "react";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down";
  subtitle?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend,
  subtitle,
  className = "",
}: StatCardProps) {
  const showTrend = trend !== undefined || change !== undefined;
  const isPositive = trend === "up" || (change !== undefined && change >= 0);

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200
        border-l-4 border-l-blue-600 p-6
        ${className}
      `}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>

      <div className="mt-2 flex items-baseline gap-3">
        <p className="text-3xl font-bold text-gray-900">{value}</p>

        {showTrend && (
          <span
            className={`inline-flex items-center text-sm font-medium ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <svg className="h-4 w-4 mr-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            ) : (
              <svg className="h-4 w-4 mr-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
              </svg>
            )}
            {change !== undefined && (
              <>{change >= 0 ? "+" : ""}{change}%</>
            )}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
    </div>
  );
}
