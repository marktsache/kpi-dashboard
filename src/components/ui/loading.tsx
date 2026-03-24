"use client";

import React from "react";

export interface LoadingProps {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles: Record<string, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

export function Loading({ text, className = "", size = "md" }: LoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-8 ${className}`}
      role="status"
    >
      <svg
        className={`animate-spin text-blue-500 ${sizeStyles[size]}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text && <p className="text-[11px] text-gray-400">{text}</p>}
      <span className="sr-only">Laden...</span>
    </div>
  );
}
