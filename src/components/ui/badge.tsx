"use client";

import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "gray";
  className?: string;
}

const colorStyles: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  gray: "bg-gray-100 text-gray-800",
};

export function Badge({ children, color = "gray", className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5
        text-xs font-medium leading-5
        ${colorStyles[color]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
