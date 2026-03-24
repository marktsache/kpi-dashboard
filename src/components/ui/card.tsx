"use client";

import React from "react";

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function Card({ title, subtitle, children, className = "", compact = false }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-card border border-gray-100 ${compact ? "p-3" : "p-4"} ${className}`}
    >
      {(title || subtitle) && (
        <div className={compact ? "mb-2" : "mb-3"}>
          {title && (
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
