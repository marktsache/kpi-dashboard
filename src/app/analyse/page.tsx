"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { KpiLineChart } from "@/components/charts/line-chart";
import { KpiBarChart } from "@/components/charts/bar-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { KpiPieChart } from "@/components/charts/pie-chart";

interface Employee {
  id: string;
  name: string;
  costCenter: string;
  active: boolean;
}

interface KpiEntry {
  id: string;
  employeeId: string;
  date: string;
  costCenter: string;
  kundenbesuche: number;
  telefonate: number;
  auftraegeAkquiriert: number;
  auftraegeAbgeschlossen: number;
  profileVerschickt: number;
  vorstellungsgespraeche: number;
  externeEinstellungen: number;
  eintritte: number;
  austritte: number;
  employee: { name: string; costCenter: string };
}

interface Stats {
  totals: Record<string, number>;
  computed: {
    kontakte: number;
    hitRate: number;
    conversionRate: number;
    besetzungsquote: number;
    nettoVeraenderung: number;
    fluktuationsrate: number;
    profileProBesetzung: number;
  };
  trends: Array<Record<string, string | number>>;
  costCenterBreakdown: Array<Record<string, string | number>>;
  entryCount: number;
}

type TimeRange = "week" | "month" | "quarter" | "year";

const KPI_FIELDS = [
  { key: "kundenbesuche", label: "Kundenbesuche" },
  { key: "telefonate", label: "Telefonate" },
  { key: "auftraegeAkquiriert", label: "Aufträge akquiriert" },
  { key: "auftraegeAbgeschlossen", label: "Aufträge abgeschlossen" },
  { key: "profileVerschickt", label: "Profile verschickt" },
  { key: "vorstellungsgespraeche", label: "Vorstellungsgespräche" },
  { key: "externeEinstellungen", label: "Externe Einstellungen" },
  { key: "eintritte", label: "Eintritte" },
  { key: "austritte", label: "Austritte" },
] as const;

const COST_CENTER_COLORS: Record<string, string> = {
  "330": "#2563eb",
  "350": "#059669",
  "370": "#dc2626",
};

function getDateRange(timeRange: TimeRange): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date();
  if (timeRange === "week") from.setDate(now.getDate() - 7);
  else if (timeRange === "month") from.setMonth(now.getMonth() - 1);
  else if (timeRange === "quarter") from.setMonth(now.getMonth() - 3);
  else if (timeRange === "year") from.setFullYear(now.getFullYear() - 1);
  return { from, to: now };
}

function buildCsvContent(entries: KpiEntry[]): string {
  const headers = [
    "Datum",
    "Mitarbeiter",
    "Kostenstelle",
    "Kundenbesuche",
    "Telefonate",
    "Aufträge akquiriert",
    "Aufträge abgeschlossen",
    "Profile verschickt",
    "Vorstellungsgespräche",
    "Externe Einstellungen",
    "Eintritte",
    "Austritte",
  ];

  const rows = entries.map((entry) => [
    new Date(entry.date).toLocaleDateString("de-DE"),
    entry.employee?.name ?? "",
    entry.costCenter,
    entry.kundenbesuche,
    entry.telefonate,
    entry.auftraegeAkquiriert,
    entry.auftraegeAbgeschlossen,
    entry.profileVerschickt,
    entry.vorstellungsgespraeche,
    entry.externeEinstellungen,
    entry.eintritte,
    entry.austritte,
  ]);

  const csvLines = [
    headers.join(";"),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(";") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(";")
    ),
  ];

  return "\uFEFF" + csvLines.join("\r\n");
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AnalysePage() {
  const { status } = useSession();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [costCenter, setCostCenter] = useState("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [rawData, setRawData] = useState<KpiEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Fetch employees list
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/employees?active=true")
      .then((r) => r.json())
      .then(setEmployees);
  }, [status]);

  // Fetch stats and raw data
  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const { from, to } = getDateRange(timeRange);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      ...(costCenter !== "all" && { costCenter }),
    });

    Promise.all([
      fetch(`/api/kpi/stats?${params}`).then((r) => r.json()),
      fetch(`/api/kpi?${params}`).then((r) => r.json()),
    ])
      .then(([statsData, rawEntries]) => {
        setStats(statsData);
        setRawData(rawEntries);
      })
      .finally(() => setLoading(false));
  }, [status, timeRange, costCenter]);

  // Employee-specific data
  const employeeEntries = useMemo(() => {
    if (selectedEmployee === "all") return rawData;
    return rawData.filter((e) => e.employeeId === selectedEmployee);
  }, [rawData, selectedEmployee]);

  const employeeTrends = useMemo(() => {
    const trendMap = new Map<string, Record<string, number>>();
    for (const entry of employeeEntries) {
      const dateKey = new Date(entry.date).toISOString().split("T")[0];
      const existing = trendMap.get(dateKey) || Object.fromEntries(KPI_FIELDS.map((f) => [f.key, 0]));
      for (const field of KPI_FIELDS) {
        existing[field.key] += entry[field.key];
      }
      trendMap.set(dateKey, existing);
    }
    return Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));
  }, [employeeEntries]);

  // Funnel data from employee entries
  const funnelData = useMemo(() => {
    const totals = Object.fromEntries(KPI_FIELDS.map((f) => [f.key, 0])) as Record<string, number>;
    for (const entry of employeeEntries) {
      for (const field of KPI_FIELDS) {
        totals[field.key] += entry[field.key];
      }
    }
    return totals;
  }, [employeeEntries]);

  // Pie chart data: activities by cost center
  const costCenterPieData = useMemo(() => {
    const byCostCenter = new Map<string, number>();
    for (const entry of rawData) {
      const cc = entry.costCenter;
      const total =
        entry.kundenbesuche +
        entry.telefonate +
        entry.auftraegeAkquiriert +
        entry.auftraegeAbgeschlossen +
        entry.profileVerschickt +
        entry.vorstellungsgespraeche +
        entry.externeEinstellungen;
      byCostCenter.set(cc, (byCostCenter.get(cc) || 0) + total);
    }
    return Array.from(byCostCenter.entries())
      .map(([cc, value]) => ({
        name: `KST ${cc}`,
        value,
        color: COST_CENTER_COLORS[cc] || "#6b7280",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawData]);

  // Recruiting pie chart
  const recruitingPieData = useMemo(() => {
    const byCostCenter = new Map<string, number>();
    for (const entry of rawData) {
      const cc = entry.costCenter;
      const total =
        entry.profileVerschickt +
        entry.vorstellungsgespraeche +
        entry.externeEinstellungen;
      byCostCenter.set(cc, (byCostCenter.get(cc) || 0) + total);
    }
    return Array.from(byCostCenter.entries())
      .map(([cc, value]) => ({
        name: `KST ${cc}`,
        value,
        color: COST_CENTER_COLORS[cc] || "#6b7280",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawData]);

  // CSV export handler
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { from, to } = getDateRange(timeRange);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
        ...(costCenter !== "all" && { costCenter }),
      });
      const res = await fetch(`/api/kpi?${params}`);
      const entries: KpiEntry[] = await res.json();
      const csv = buildCsvContent(entries);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadCsv(csv, `KPI-Export_${dateStr}.csv`);
    } finally {
      setExporting(false);
    }
  }, [timeRange, costCenter]);

  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." />;
  }

  return (
    <AppShell pageTitle="Analyse">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex bg-white rounded-lg border shadow-sm">
          {(["week", "month", "quarter", "year"] as const).map((range, i, arr) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium transition ${
                timeRange === range
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              } ${i === 0 ? "rounded-l-lg" : ""} ${i === arr.length - 1 ? "rounded-r-lg" : ""}`}
            >
              {range === "week"
                ? "Woche"
                : range === "month"
                  ? "Monat"
                  : range === "quarter"
                    ? "Quartal"
                    : "Jahr"}
            </button>
          ))}
        </div>

        <select
          value={costCenter}
          onChange={(e) => setCostCenter(e.target.value)}
          className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Alle Kostenstellen</option>
          <option value="330">KST 330</option>
          <option value="350">KST 350</option>
          <option value="370">KST 370</option>
        </select>

        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Alle Mitarbeiter</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} (KST {emp.costCenter})
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <Button
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
            disabled={exporting}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            CSV Export
          </Button>
        </div>
      </div>

      {loading ? (
        <Loading text="Analyse-Daten werden geladen..." />
      ) : (
        <>
          {/* Detailed Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {/* Vertrieb Trends */}
            <Card title="Vertrieb - Trend" subtitle={selectedEmployee !== "all" ? employees.find((e) => e.id === selectedEmployee)?.name : undefined}>
              <KpiLineChart
                data={selectedEmployee === "all" ? (stats?.trends ?? []) : employeeTrends}
                xKey="date"
                lines={[
                  { key: "kundenbesuche", color: "#2563eb", name: "Kundenbesuche" },
                  { key: "telefonate", color: "#7c3aed", name: "Telefonate" },
                  { key: "auftraegeAkquiriert", color: "#059669", name: "Akquiriert" },
                  { key: "auftraegeAbgeschlossen", color: "#dc2626", name: "Abgeschlossen" },
                ]}
                height={280}
              />
            </Card>

            {/* Recruiting Trends */}
            <Card title="Recruiting - Trend" subtitle={selectedEmployee !== "all" ? employees.find((e) => e.id === selectedEmployee)?.name : undefined}>
              <KpiLineChart
                data={selectedEmployee === "all" ? (stats?.trends ?? []) : employeeTrends}
                xKey="date"
                lines={[
                  { key: "profileVerschickt", color: "#2563eb", name: "Profile" },
                  { key: "vorstellungsgespraeche", color: "#7c3aed", name: "VG" },
                  { key: "externeEinstellungen", color: "#059669", name: "Einstellungen" },
                ]}
                height={280}
              />
            </Card>

            {/* Personal Trends */}
            <Card title="Personal - Trend" subtitle={selectedEmployee !== "all" ? employees.find((e) => e.id === selectedEmployee)?.name : undefined}>
              <KpiLineChart
                data={selectedEmployee === "all" ? (stats?.trends ?? []) : employeeTrends}
                xKey="date"
                lines={[
                  { key: "eintritte", color: "#059669", name: "Eintritte" },
                  { key: "austritte", color: "#dc2626", name: "Austritte" },
                ]}
                height={280}
              />
            </Card>
          </div>

          {/* Conversion Funnels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card title="Vertrieb-Funnel">
              <FunnelChart
                steps={[
                  {
                    label: "Kontakte",
                    value: funnelData.kundenbesuche + funnelData.telefonate,
                    color: "#3b82f6",
                  },
                  {
                    label: "Akquiriert",
                    value: funnelData.auftraegeAkquiriert,
                    color: "#8b5cf6",
                  },
                  {
                    label: "Abgeschlossen",
                    value: funnelData.auftraegeAbgeschlossen,
                    color: "#10b981",
                  },
                ]}
              />
            </Card>

            <Card title="Recruiting-Funnel">
              <FunnelChart
                steps={[
                  {
                    label: "Profile",
                    value: funnelData.profileVerschickt,
                    color: "#3b82f6",
                  },
                  {
                    label: "VG",
                    value: funnelData.vorstellungsgespraeche,
                    color: "#8b5cf6",
                  },
                  {
                    label: "Einstellungen",
                    value: funnelData.externeEinstellungen,
                    color: "#10b981",
                  },
                ]}
              />
            </Card>
          </div>

          {/* Pie Charts - Distribution by Cost Center */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card title="Vertriebsaktivitäten nach Kostenstelle">
              <KpiPieChart data={costCenterPieData} donut />
            </Card>

            <Card title="Recruiting-Aktivitäten nach Kostenstelle">
              <KpiPieChart data={recruitingPieData} donut />
            </Card>
          </div>

          {/* Per-Employee Drill-Down */}
          {selectedEmployee !== "all" && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Detailansicht: {employees.find((e) => e.id === selectedEmployee)?.name}
              </h2>

              {/* Employee-specific bar chart per date */}
              <Card title="Tagesübersicht - Vertrieb" className="mb-6">
                <KpiBarChart
                  data={employeeTrends}
                  xKey="date"
                  bars={[
                    { key: "kundenbesuche", color: "#2563eb", name: "Kundenbesuche" },
                    { key: "telefonate", color: "#7c3aed", name: "Telefonate" },
                    { key: "auftraegeAkquiriert", color: "#059669", name: "Akquiriert" },
                    { key: "auftraegeAbgeschlossen", color: "#dc2626", name: "Abgeschlossen" },
                  ]}
                  height={300}
                  stacked
                />
              </Card>

              <Card title="Tagesübersicht - Recruiting" className="mb-6">
                <KpiBarChart
                  data={employeeTrends}
                  xKey="date"
                  bars={[
                    { key: "profileVerschickt", color: "#2563eb", name: "Profile" },
                    { key: "vorstellungsgespraeche", color: "#7c3aed", name: "VG" },
                    { key: "externeEinstellungen", color: "#059669", name: "Einstellungen" },
                  ]}
                  height={300}
                  stacked
                />
              </Card>

              {/* Employee summary table */}
              <Card title="Zusammenfassung" className="mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Kennzahl
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">
                          Wert
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">
                          Ø pro Eintrag
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {KPI_FIELDS.map((field) => {
                        const total = funnelData[field.key];
                        const count = employeeEntries.length;
                        const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
                        return (
                          <tr
                            key={field.key}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4 font-medium text-gray-700">
                              {field.label}
                            </td>
                            <td className="text-right py-3 px-4 tabular-nums text-gray-900 font-semibold">
                              {total.toLocaleString("de-DE")}
                            </td>
                            <td className="text-right py-3 px-4 tabular-nums text-gray-500">
                              {avg.toLocaleString("de-DE")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* No data state */}
          {rawData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">Keine Daten vorhanden</p>
              <p className="text-sm mt-1">
                Für den gewählten Zeitraum und Filter sind keine KPI-Einträge verfügbar.
              </p>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
