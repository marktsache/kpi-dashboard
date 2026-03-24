"use client";

import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "gray";
  className?: string;
}

const colorStyles: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-500/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
  red: "bg-red-50 text-red-700 ring-red-500/20",
  yellow: "bg-amber-50 text-amber-700 ring-amber-500/20",
  gray: "bg-gray-50 text-gray-600 ring-gray-500/20",
};

export function Badge({ children, color = "gray", className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-md px-1.5 py-0.5
        text-[10px] font-semibold ring-1 ring-inset
        ${colorStyles[color]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
