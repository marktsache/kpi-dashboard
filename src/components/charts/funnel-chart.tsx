"use client";

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

export function FunnelChart({ steps }: FunnelChartProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 h-[300px]">
        Keine Daten
      </div>
    );
  }

  const maxValue = steps[0].value;

  return (
    <div className="flex flex-col gap-2 py-2">
      {steps.map((step, index) => {
        const widthPercent = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
        const nextStep = steps[index + 1];
        const conversionPercent =
          nextStep && step.value > 0
            ? ((nextStep.value / step.value) * 100).toFixed(1)
            : null;

        return (
          <div key={step.label} className="flex flex-col items-center gap-1">
            {/* Bar row */}
            <div className="flex items-center w-full gap-3">
              {/* Label */}
              <span className="text-sm text-gray-600 w-32 text-right shrink-0 truncate">
                {step.label}
              </span>

              {/* Bar container */}
              <div className="flex-1 flex justify-center">
                <div
                  className="h-10 rounded-md flex items-center justify-center transition-all duration-300"
                  style={{
                    width: `${Math.max(widthPercent, 8)}%`,
                    backgroundColor: step.color,
                  }}
                >
                  <span className="text-white text-sm font-semibold drop-shadow-sm">
                    {step.value.toLocaleString("de-DE")}
                  </span>
                </div>
              </div>
            </div>

            {/* Conversion arrow */}
            {conversionPercent !== null && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <span>{conversionPercent}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
