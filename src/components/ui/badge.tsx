"use client";

import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "gray" | "orange" | "gold";
  className?: string;
}

const colorStyles: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-500/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
  red: "bg-red-50 text-red-700 ring-red-500/20",
  yellow: "bg-amber-50 text-amber-700 ring-amber-500/20",
  gray: "bg-gray-50 text-gray-600 ring-gray-500/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-500/20",
  gold: "bg-yellow-50 text-yellow-700 ring-yellow-500/20",
};

/** Returns the badge color for a cost center. 330=blue, 350=orange, 370=gold */
export function kstColor(costCenter: string): BadgeProps["color"] {
  if (costCenter === "350") return "orange";
  if (costCenter === "370") return "gold";
  return "blue"; // 330 and default
}

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
