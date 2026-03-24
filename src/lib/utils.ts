export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString("de-DE");
}

export function calculateConversionRate(
  numerator: number,
  denominator: number
): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export const costCenterLabels: Record<string, string> = {
  "330": "Kostenstelle 330",
  "350": "Kostenstelle 350",
  "370": "Kostenstelle 370",
};

export function getCostCenterColor(costCenter: string): string {
  switch (costCenter) {
    case "330":
      return "bg-blue-500 text-white";
    case "350":
      return "bg-emerald-500 text-white";
    case "370":
      return "bg-amber-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

export function dateRangePresets(
  preset: "week" | "month" | "quarter"
): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case "week": {
      const start = new Date(end);
      const dayOfWeek = start.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start, end };
    }
    case "quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
      return { start, end };
    }
  }
}
