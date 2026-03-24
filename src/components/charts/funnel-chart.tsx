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
      <div className="flex items-center justify-center text-xs text-gray-300 h-[200px]">
        Keine Daten vorhanden
      </div>
    );
  }

  const maxValue = steps[0].value;

  return (
    <div className="flex flex-col gap-1 py-1">
      {steps.map((step, index) => {
        const widthPercent = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
        const nextStep = steps[index + 1];
        const conversionPercent =
          nextStep && step.value > 0
            ? ((nextStep.value / step.value) * 100).toFixed(1)
            : null;

        return (
          <div key={step.label} className="flex flex-col items-center gap-0.5">
            <div className="flex items-center w-full gap-2">
              <span className="text-[11px] text-gray-500 w-24 text-right shrink-0 font-medium">
                {step.label}
              </span>
              <div className="flex-1 flex justify-center">
                <div
                  className="h-8 rounded-md flex items-center justify-center transition-all duration-500"
                  style={{
                    width: `${Math.max(widthPercent, 10)}%`,
                    backgroundColor: step.color,
                    opacity: 1 - index * 0.1,
                  }}
                >
                  <span className="text-white text-[11px] font-bold drop-shadow-sm">
                    {step.value.toLocaleString("de-DE")}
                  </span>
                </div>
              </div>
            </div>
            {conversionPercent !== null && (
              <div className="flex items-center gap-0.5 text-[10px] text-gray-300 ml-24">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
