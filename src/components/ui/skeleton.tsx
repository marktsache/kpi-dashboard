"use client";

import React from "react";

// Base Skeleton - animated placeholder
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />;
}

// Matches StatCard layout: accent line top, title block, value block, trend block
export function SkeletonStatCard() {
  return (
    <div className="relative bg-white rounded-xl shadow-card border border-gray-100 p-4 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200" />
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
      <Skeleton className="h-7 w-24 mt-2" />
      <Skeleton className="h-3 w-16 mt-2" />
    </div>
  );
}

// Chart placeholder inside a Card wrapper
interface SkeletonChartProps {
  height?: string;
}

export function SkeletonChart({ height = "h-64" }: SkeletonChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className={`w-full rounded-lg ${height}`} />
    </div>
  );
}

// Table placeholder with configurable rows/cols
interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
      {/* Header row */}
      <div className="flex gap-4 mb-3 pb-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard-specific: 4 StatCards + 2 Charts
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <SkeletonChart />
      <SkeletonChart height="h-48" />
    </div>
  );
}
