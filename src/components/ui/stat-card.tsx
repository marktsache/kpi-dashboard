"use client";

import React from "react";
import { createPortal } from "react-dom";

function TrendBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
        isPositive
          ? "text-emerald-700 bg-emerald-50/80"
          : "text-red-700 bg-red-50/80"
      }`}
    >
      <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
        {isPositive ? (
          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
        )}
      </svg>
      {value >= 0 ? "+" : ""}{value}%
    </span>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const iconRef = React.useRef<HTMLSpanElement>(null);

  const handleEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  };

  return (
    <>
      <span
        ref={iconRef}
        className="inline-flex items-center cursor-help flex-shrink-0"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
      >
        <svg className="h-3 w-3 text-gray-300 hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </span>
      {show && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] px-3 py-2 text-[11px] leading-snug font-normal text-white bg-gray-800 rounded-lg shadow-xl w-52 text-center pointer-events-none"
            style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -100%)" }}
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-800" />
          </div>,
          document.body
        )
      }
    </>
  );
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  compareValue?: string;
  compareTooltip?: string;
  avgValue?: string;
  avgTooltip?: string;
  avgChange?: number;
  trend?: "up" | "down";
  subtitle?: string;
  accent?: string;
  tint?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  compareValue,
  compareTooltip,
  avgValue,
  avgTooltip,
  avgChange,
  trend,
  subtitle,
  accent = "from-blue-500 to-blue-600",
  tint,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`
        group relative rounded-xl shadow-card hover:shadow-card-hover
        border border-gray-100/80 p-4 transition-all duration-200
        overflow-hidden
        ${tint || "bg-white"}
        ${className}
      `}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent}`} />

      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{title}</p>

      <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>

      {/* Compare rows */}
      {(compareValue || avgValue) && (
        <div className="mt-2 pt-2 border-t border-gray-200/60 space-y-1.5">
          {compareValue && (
            <div className="flex items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 leading-none">
                {compareTooltip && <InfoTooltip text={compareTooltip} />}
                Vorjahr: {compareValue}
              </span>
              {change !== undefined && <TrendBadge value={change} />}
            </div>
          )}
          {avgValue && (
            <div className="flex items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 leading-none">
                {avgTooltip && <InfoTooltip text={avgTooltip} />}
                &#216; Schnitt: {avgValue}
              </span>
              {avgChange !== undefined && <TrendBadge value={avgChange} />}
            </div>
          )}
        </div>
      )}

      {/* Fallback: trend-only (no compare values) */}
      {!compareValue && !avgValue && trend !== undefined && (
        <div className="mt-1">
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
              trend === "up" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              {trend === "up" ? (
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
              )}
            </svg>
          </span>
        </div>
      )}

      {subtitle && (
        <p className="text-[11px] text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
