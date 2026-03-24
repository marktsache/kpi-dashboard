"use client";

import React, { forwardRef } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-medium text-gray-500 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            block w-full rounded-lg border px-2.5 py-1.5 text-xs text-gray-900
            placeholder:text-gray-300
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${
              error
                ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
                : "border-gray-200 hover:border-gray-300"
            }
            ${className}
          `}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-0.5 text-[11px] text-red-500">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-0.5 text-[11px] text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
