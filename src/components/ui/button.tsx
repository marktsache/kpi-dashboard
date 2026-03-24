"use client";

import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-gradient-to-b from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md active:shadow-sm border border-blue-600/50 disabled:from-blue-300 disabled:to-blue-300 disabled:border-blue-200",
  secondary:
    "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow disabled:bg-gray-50 disabled:text-gray-400",
  danger:
    "bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-sm border border-red-600/50 disabled:from-red-300 disabled:to-red-300",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-400",
};

const sizeStyles: Record<string, string> = {
  xs: "px-2 py-1 text-[11px] rounded-md",
  sm: "px-2.5 py-1 text-xs rounded-lg",
  md: "px-3 py-1.5 text-xs rounded-lg",
  lg: "px-4 py-2 text-sm rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1
        disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
