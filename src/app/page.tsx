"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Loading } from "@/components/ui/loading";
import { KpiLineChart } from "@/components/charts/line-chart";
import { KpiBarChart } from "@/components/charts/bar-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { KpiPieChart } from "@/components/charts/pie-chart";
import { Button } from "@/components/ui/button";
import { useFilters, TIME_RANGE_LABELS } from "@/lib/filter-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  telefonate: number;
  auftraegeAkquiriert: number;
  auftraegeAbgeschlossen: number;
  profile: number;
  vorstellungsgespraeche: number;
  deals: number;
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
    dealQuote: number;
    maWachstum: number;
  };
  trends: Array<Record<string, unknown>>;
  costCenterBreakdown: Array<Record<string, string | number>>;
  yearComparison: Array<Record<string, string | number>>;
  years: string[];
  entryCount: number;
  previousTotals: Record<string, number> | null;
  previousComputed: {
    kontakte: number;
    hitRate: number;
    conversionRate: number;
    dealQuote: number;
    maWachstum: number;
  } | null;
}

const KPI_FIELDS = [
  { key: "telefonate", label: "Telefonate" },
  { key: "auftraegeAkquiriert", label: "Aufträge akquiriert" },
  { key: "auftraegeAbgeschlossen", label: "Aufträge abgeschlossen" },
  { key: "profile", label: "Profile" },
  { key: "vorstellungsgespraeche", label: "VG's" },
  { key: "deals", label: "Deals" },
  { key: "eintritte", label: "Eintritte" },
  { key: "austritte", label: "Austritte" },
] as const;

const YEAR_COLORS: Record<number, string> = {
  0: "#94a3b8", 1: "#3b82f6", 2: "#10b981", 3: "#f59e0b", 4: "#8b5cf6", 5: "#ef4444",
};

const COST_CENTER_COLORS: Record<string, string> = {
  "330": "#2563eb", "350": "#059669", "370": "#dc2626",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0) return current > 0 ? 100 : undefined;
  return Math.round(((current - previous) / previous) * 100);
}

function formatDE(d: string): string {
  return new Date(d).toLocaleDateString("de-DE");
}

function buildCsvContent(entries: KpiEntry[]): string {
  const headers = [
    "Datum", "Mitarbeiter", "Kostenstelle",
    "Telefonate", "Aufträge akquiriert", "Aufträge abgeschlossen",
    "Profile", "VG's", "Deals", "Eintritte", "Austritte",
  ];
  const rows = entries.map((entry) => [
    new Date(entry.date).toLocaleDateString("de-DE"),
    entry.employee?.name ?? "", entry.costCenter,
    entry.telefonate, entry.auftraegeAkquiriert, entry.auftraegeAbgeschlossen,
    entry.profile, entry.vorstellungsgespraeche, entry.deals, entry.eintritte, entry.austritte,
  ]);
  const csvLines = [
    headers.join(";"),
    ...rows.map((row) => row.map((cell) => {
      const str = String(cell);
      if (str.includes(";") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
      return str;
    }).join(";")),
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

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const filters = useFilters();
  const {
    timeRange, setTimeRange,
    customFrom, setCustomFrom, customTo, setCustomTo,
    viewMode, setViewMode,
    costCenter, setCostCenter,
    dateRange,
  } = filters;

  const [stats, setStats] = useState<Stats | null>(null);
  const [rawData, setRawData] = useState<KpiEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [yearCompData, setYearCompData] = useState<Array<Record<string, string | number>>>([]);
  const [yearCompYears, setYearCompYears] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/employees?active=true").then((r) => r.json()).then(setEmployees);
  }, [status]);

  // Main data fetch
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    const params = new URLSearchParams({
      from: new Date(dateRange.from + "T00:00:00").toISOString(),
      to: new Date(dateRange.to + "T23:59:59").toISOString(),
      viewMode,
      ...(costCenter !== "all" && { costCenter }),
    });
    Promise.all([
      fetch(`/api/kpi/stats?${params}`).then((r) => r.json()),
      fetch(`/api/kpi?${params}`).then((r) => r.json()),
    ]).then(([statsData, rawEntries]) => {
      setStats(statsData);
      setRawData(rawEntries);
    }).finally(() => setLoading(false));
  }, [status, dateRange, costCenter, viewMode]);

  // Year comparison fetch
  useEffect(() => {
    if (status !== "authenticated") return;
    const yearFrom = new Date();
    yearFrom.setFullYear(yearFrom.getFullYear() - 5);
    yearFrom.setMonth(0, 1);
    const yearTo = new Date();
    yearTo.setMonth(11, 31);
    const params = new URLSearchParams({
      from: yearFrom.toISOString(), to: yearTo.toISOString(),
      viewMode: "month",
      ...(costCenter !== "all" && { costCenter }),
    });
    fetch(`/api/kpi/stats?${params}`).then((r) => r.json()).then((data: Stats) => {
      setYearCompData(data.yearComparison ?? []);
      setYearCompYears(data.years ?? []);
    }).catch(() => { setYearCompData([]); setYearCompYears([]); });
  }, [status, costCenter]);

  // Employee-filtered entries
  const employeeEntries = useMemo(() => {
    if (selectedEmployee === "all") return rawData;
    return rawData.filter((e) => e.employeeId === selectedEmployee);
  }, [rawData, selectedEmployee]);

  // Employee trends
  const employeeTrends = useMemo(() => {
    if (selectedEmployee === "all") return null;
    const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    function getISOWeek(d: Date): number {
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }
    const zeroRow = () => Object.fromEntries(KPI_FIELDS.map((f) => [f.key, 0])) as Record<string, number>;
    if (viewMode === "month") {
      const buckets = Array.from({ length: 12 }, () => zeroRow());
      for (const entry of employeeEntries) {
        const m = new Date(entry.date).getMonth();
        for (const field of KPI_FIELDS) buckets[m][field.key] += entry[field.key];
      }
      return buckets.map((data, i) => ({ label: monthNames[i], ...data }));
    } else {
      const buckets = Array.from({ length: 52 }, () => zeroRow());
      for (const entry of employeeEntries) {
        const kw = getISOWeek(new Date(entry.date));
        const idx = Math.min(kw - 1, 51);
        for (const field of KPI_FIELDS) buckets[idx][field.key] += entry[field.key];
      }
      return buckets.map((data, i) => ({ label: `KW ${i + 1}`, ...data }));
    }
  }, [selectedEmployee, employeeEntries, viewMode]);

  // Totals for employee-filtered view
  const filteredTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const field of KPI_FIELDS) t[field.key] = 0;
    for (const entry of employeeEntries) {
      for (const field of KPI_FIELDS) t[field.key] += entry[field.key];
    }
    return t;
  }, [employeeEntries]);

  // Pie chart data
  const costCenterPieData = useMemo(() => {
    const byCostCenter = new Map<string, number>();
    for (const entry of rawData) {
      const cc = entry.costCenter;
      const total = entry.telefonate + entry.auftraegeAkquiriert + entry.auftraegeAbgeschlossen;
      byCostCenter.set(cc, (byCostCenter.get(cc) || 0) + total);
    }
    return Array.from(byCostCenter.entries()).map(([cc, value]) => ({
      name: `KST ${cc}`, value, color: COST_CENTER_COLORS[cc] || "#6b7280",
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawData]);

  const profilePieData = useMemo(() => {
    const byCostCenter = new Map<string, number>();
    for (const entry of rawData) {
      const cc = entry.costCenter;
      const total = entry.profile + entry.vorstellungsgespraeche + entry.deals;
      byCostCenter.set(cc, (byCostCenter.get(cc) || 0) + total);
    }
    return Array.from(byCostCenter.entries()).map(([cc, value]) => ({
      name: `KST ${cc}`, value, color: COST_CENTER_COLORS[cc] || "#6b7280",
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawData]);

  // Monthly breakdown for table (from rawData, respects all filters)
  const monthlyBreakdown = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const buckets = Array.from({ length: 12 }, () => ({
      profile: 0, vorstellungsgespraeche: 0, deals: 0, eintritte: 0, austritte: 0,
    }));
    for (const entry of employeeEntries) {
      const m = new Date(entry.date).getMonth();
      buckets[m].profile += entry.profile;
      buckets[m].vorstellungsgespraeche += entry.vorstellungsgespraeche;
      buckets[m].deals += entry.deals;
      buckets[m].eintritte += entry.eintritte;
      buckets[m].austritte += entry.austritte;
    }
    return buckets
      .map((b, i) => ({
        label: monthNames[i],
        ...b,
        vgQuote: b.profile > 0 ? Math.round((b.vorstellungsgespraeche / b.profile) * 1000) / 10 : 0,
        dealQuote: b.profile > 0 ? Math.round((b.deals / b.profile) * 1000) / 10 : 0,
        maWachstum: b.eintritte - b.austritte,
      }))
      .filter((b) => b.profile > 0 || b.vorstellungsgespraeche > 0 || b.deals > 0 || b.eintritte > 0 || b.austritte > 0);
  }, [employeeEntries]);

  // Yearly totals from yearCompData
  const yearlyOverview = useMemo(() => {
    if (!yearCompYears.length || !yearCompData.length) return [];
    return yearCompYears.map((year) => {
      let profile = 0, vg = 0, deals = 0, eintritte = 0, austritte = 0;
      for (const row of yearCompData) {
        profile += (row[`profile_${year}`] as number) || 0;
        vg += (row[`vorstellungsgespraeche_${year}`] as number) || 0;
        deals += (row[`deals_${year}`] as number) || 0;
        eintritte += (row[`eintritte_${year}`] as number) || 0;
        austritte += (row[`austritte_${year}`] as number) || 0;
      }
      return {
        label: year,
        profile, vorstellungsgespraeche: vg, deals, eintritte, austritte,
        vgQuote: profile > 0 ? Math.round((vg / profile) * 1000) / 10 : 0,
        dealQuote: profile > 0 ? Math.round((deals / profile) * 1000) / 10 : 0,
        maWachstum: eintritte - austritte,
      };
    });
  }, [yearCompData, yearCompYears]);

  const handleExport = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        from: new Date(dateRange.from + "T00:00:00").toISOString(),
        to: new Date(dateRange.to + "T23:59:59").toISOString(),
        ...(costCenter !== "all" && { costCenter }),
      });
      const res = await fetch(`/api/kpi?${params}`);
      const entries: KpiEntry[] = await res.json();
      const csv = buildCsvContent(entries);
      downloadCsv(csv, `KPI-Export_${new Date().toISOString().split("T")[0]}.csv`);
    } finally {
      setExporting(false);
    }
  }, [dateRange, costCenter]);

  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." />;
  }

  // Decide which data to use for charts
  const trendData = employeeTrends ?? (stats?.trends ?? []);
  const t = selectedEmployee === "all" && stats ? stats.totals : filteredTotals;
  const prev = selectedEmployee === "all" ? stats?.previousTotals : null;
  const comp = selectedEmployee === "all" ? stats?.computed : null;
  const prevComp = selectedEmployee === "all" ? stats?.previousComputed : null;

  // Computed values for filtered view
  const dealQuote = t.profile > 0 ? Math.round((t.deals / t.profile) * 1000) / 10 : 0;
  const hitRate = t.auftraegeAkquiriert > 0
    ? Math.round((t.auftraegeAbgeschlossen / t.auftraegeAkquiriert) * 100) : 0;
  const conversionRate = t.telefonate > 0
    ? Math.round((t.auftraegeAbgeschlossen / t.telefonate) * 100) : 0;
  const maWachstum = t.eintritte - t.austritte;

  return (
    <AppShell pageTitle="Analyse">
      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
          className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-gray-600"
        >
          {Object.entries(TIME_RANGE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {timeRange === "custom" && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] font-medium shadow-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-gray-600" />
            <span className="text-[11px] text-gray-400">bis</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] font-medium shadow-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-gray-600" />
          </div>
        )}

        {/* Date range badge - always visible */}
        {dateRange.from && dateRange.to && (
          <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-500">
            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDE(dateRange.from)} – {formatDE(dateRange.to)}
          </span>
        )}

        <div className="flex bg-white rounded-lg border border-gray-200 shadow-card overflow-hidden">
          {(["week", "month"] as const).map((vm) => (
            <button
              key={vm}
              onClick={() => setViewMode(vm)}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${
                viewMode === vm
                  ? "bg-navy-800 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {vm === "week" ? "je Woche" : "je Monat"}
            </button>
          ))}
        </div>

        <select
          value={costCenter}
          onChange={(e) => setCostCenter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-gray-600"
        >
          <option value="all">Alle Kostenstellen</option>
          <option value="330">KST 330</option>
          <option value="350">KST 350</option>
          <option value="370">KST 370</option>
        </select>

        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-gray-600"
        >
          <option value="all">Alle Mitarbeiter</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name} (KST {emp.costCenter})</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {stats && (
            <span className="text-[10px] text-gray-300">
              {stats.entryCount} Einträge
            </span>
          )}
          <Button variant="secondary" onClick={handleExport} loading={exporting} disabled={exporting}>
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <Loading text="Daten werden geladen..." />
      ) : stats ? (
        <div className="space-y-8">

          {/* ══════════════════════════════════════════════════════
              PROFILE SECTION
              ══════════════════════════════════════════════════════ */}
          <Section title="Profile">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                title="Profile"
                value={t.profile}
                change={prev ? pctChange(t.profile, prev.profile ?? 0) : undefined}
                accent="from-blue-400 to-cyan-500"
              />
              <StatCard
                title="VG's"
                value={t.vorstellungsgespraeche}
                change={prev ? pctChange(t.vorstellungsgespraeche, prev.vorstellungsgespraeche ?? 0) : undefined}
                accent="from-indigo-400 to-indigo-500"
              />
              <StatCard
                title="Deals"
                value={t.deals}
                change={prev ? pctChange(t.deals, prev.deals ?? 0) : undefined}
                accent="from-teal-500 to-teal-600"
              />
              <StatCard
                title="Deal-Quote"
                value={`${comp?.dealQuote ?? dealQuote}%`}
                change={prevComp ? pctChange(comp?.dealQuote ?? dealQuote, prevComp.dealQuote) : undefined}
                accent="from-amber-500 to-amber-600"
              />
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">Profile - Trend</h3>
              <KpiLineChart
                data={trendData as Record<string, unknown>[]}
                xKey="label"
                lines={[
                  { key: "profile", color: "#3b82f6", name: "Profile" },
                  { key: "vorstellungsgespraeche", color: "#8b5cf6", name: "VG" },
                  { key: "deals", color: "#10b981", name: "Deals" },
                ]}
                height={280}
              />
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">Profile-Funnel</h3>
              <FunnelChart
                steps={[
                  { label: "Profile", value: t.profile, color: "#3b82f6" },
                  { label: "VG's", value: t.vorstellungsgespraeche, color: "#8b5cf6" },
                  { label: "Deals", value: t.deals, color: "#10b981" },
                ]}
              />
            </div>

            {/* Monatsübersicht */}
            {monthlyBreakdown.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                <h3 className="text-xs font-semibold text-gray-700 mb-3">Monatsübersicht</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Monat</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Profile</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">VG&apos;s</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Deals</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">VG-Quote</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Deal-Quote</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">MA-Wachstum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyBreakdown.map((row) => (
                        <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-medium text-gray-700">{row.label}</td>
                          <td className="text-right py-2 px-3 tabular-nums">{row.profile.toLocaleString("de-DE")}</td>
                          <td className="text-right py-2 px-3 tabular-nums">{row.vorstellungsgespraeche.toLocaleString("de-DE")}</td>
                          <td className="text-right py-2 px-3 tabular-nums">{row.deals.toLocaleString("de-DE")}</td>
                          <td className="text-right py-2 px-3 tabular-nums text-gray-500">{row.vgQuote}%</td>
                          <td className="text-right py-2 px-3 tabular-nums text-gray-500">{row.dealQuote}%</td>
                          <td className={`text-right py-2 px-3 tabular-nums font-semibold ${row.maWachstum > 0 ? "text-emerald-600" : row.maWachstum < 0 ? "text-red-600" : "text-gray-400"}`}>
                            {row.maWachstum > 0 ? "+" : ""}{row.maWachstum}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50/50 font-semibold">
                        <td className="py-2 px-3 text-gray-900">Gesamt</td>
                        <td className="text-right py-2 px-3 tabular-nums text-gray-900">{monthlyBreakdown.reduce((s, r) => s + r.profile, 0).toLocaleString("de-DE")}</td>
                        <td className="text-right py-2 px-3 tabular-nums text-gray-900">{monthlyBreakdown.reduce((s, r) => s + r.vorstellungsgespraeche, 0).toLocaleString("de-DE")}</td>
                        <td className="text-right py-2 px-3 tabular-nums text-gray-900">{monthlyBreakdown.reduce((s, r) => s + r.deals, 0).toLocaleString("de-DE")}</td>
                        {(() => {
                          const tp = monthlyBreakdown.reduce((s, r) => s + r.profile, 0);
                          const tv = monthlyBreakdown.reduce((s, r) => s + r.vorstellungsgespraeche, 0);
                          const td = monthlyBreakdown.reduce((s, r) => s + r.deals, 0);
                          const te = monthlyBreakdown.reduce((s, r) => s + r.eintritte, 0);
                          const ta = monthlyBreakdown.reduce((s, r) => s + r.austritte, 0);
                          const tg = te - ta;
                          return (
                            <>
                              <td className="text-right py-2 px-3 tabular-nums text-gray-600">{tp > 0 ? Math.round((tv / tp) * 1000) / 10 : 0}%</td>
                              <td className="text-right py-2 px-3 tabular-nums text-gray-600">{tp > 0 ? Math.round((td / tp) * 1000) / 10 : 0}%</td>
                              <td className={`text-right py-2 px-3 tabular-nums font-bold ${tg > 0 ? "text-emerald-600" : tg < 0 ? "text-red-600" : "text-gray-400"}`}>
                                {tg > 0 ? "+" : ""}{tg}
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Jahresübersicht */}
            {yearlyOverview.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                <h3 className="text-xs font-semibold text-gray-700 mb-3">Jahresübersicht</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Jahr</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Profile</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">VG&apos;s</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Deals</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">VG-Quote</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Deal-Quote</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">MA-Wachstum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyOverview.map((row) => (
                        <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-medium text-gray-700">{row.label}</td>
                          <td className="text-right py-2 px-3 tabular-nums">{row.profile.toLocaleString("de-DE")}</td>
                          <td className="text-right py-2 px-3 tabular-nums">{row.vorstellungsgespraeche.toLocaleString("de-DE")}</td>
                          <td className="text-right py-2 px-3 tabular-nums">{row.deals.toLocaleString("de-DE")}</td>
                          <td className="text-right py-2 px-3 tabular-nums text-gray-500">{row.vgQuote}%</td>
                          <td className="text-right py-2 px-3 tabular-nums text-gray-500">{row.dealQuote}%</td>
                          <td className={`text-right py-2 px-3 tabular-nums font-semibold ${row.maWachstum > 0 ? "text-emerald-600" : row.maWachstum < 0 ? "text-red-600" : "text-gray-400"}`}>
                            {row.maWachstum > 0 ? "+" : ""}{row.maWachstum}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50/50 font-semibold">
                        <td className="py-2 px-3 text-gray-900">Gesamt</td>
                        <td className="text-right py-2 px-3 tabular-nums text-gray-900">{yearlyOverview.reduce((s, r) => s + r.profile, 0).toLocaleString("de-DE")}</td>
                        <td className="text-right py-2 px-3 tabular-nums text-gray-900">{yearlyOverview.reduce((s, r) => s + r.vorstellungsgespraeche, 0).toLocaleString("de-DE")}</td>
                        <td className="text-right py-2 px-3 tabular-nums text-gray-900">{yearlyOverview.reduce((s, r) => s + r.deals, 0).toLocaleString("de-DE")}</td>
                        {(() => {
                          const tp = yearlyOverview.reduce((s, r) => s + r.profile, 0);
                          const tv = yearlyOverview.reduce((s, r) => s + r.vorstellungsgespraeche, 0);
                          const td = yearlyOverview.reduce((s, r) => s + r.deals, 0);
                          const te = yearlyOverview.reduce((s, r) => s + r.eintritte, 0);
                          const ta = yearlyOverview.reduce((s, r) => s + r.austritte, 0);
                          const tg = te - ta;
                          return (
                            <>
                              <td className="text-right py-2 px-3 tabular-nums text-gray-600">{tp > 0 ? Math.round((tv / tp) * 1000) / 10 : 0}%</td>
                              <td className="text-right py-2 px-3 tabular-nums text-gray-600">{tp > 0 ? Math.round((td / tp) * 1000) / 10 : 0}%</td>
                              <td className={`text-right py-2 px-3 tabular-nums font-bold ${tg > 0 ? "text-emerald-600" : tg < 0 ? "text-red-600" : "text-gray-400"}`}>
                                {tg > 0 ? "+" : ""}{tg}
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </Section>

          {/* ══════════════════════════════════════════════════════
              EINSTELLUNGEN SECTION
              ══════════════════════════════════════════════════════ */}
          <Section title="Einstellungen">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                title="Eintritte"
                value={t.eintritte}
                change={prev ? pctChange(t.eintritte, prev.eintritte ?? 0) : undefined}
                accent="from-emerald-500 to-emerald-600"
              />
              <StatCard
                title="Austritte"
                value={t.austritte}
                change={prev ? pctChange(t.austritte, prev.austritte ?? 0) : undefined}
                accent="from-rose-400 to-rose-500"
              />
              <StatCard
                title="MA-Wachstum"
                value={comp?.maWachstum ?? maWachstum}
                trend={(comp?.maWachstum ?? maWachstum) >= 0 ? "up" : "down"}
                subtitle={`${t.eintritte} Ein / ${t.austritte} Aus`}
                accent="from-violet-500 to-violet-600"
              />
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">Einstellungen - Trend</h3>
              <KpiLineChart
                data={trendData as Record<string, unknown>[]}
                xKey="label"
                lines={[
                  { key: "eintritte", color: "#10b981", name: "Eintritte" },
                  { key: "austritte", color: "#ef4444", name: "Austritte" },
                ]}
                height={280}
              />
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════
              VERTRIEB SECTION
              ══════════════════════════════════════════════════════ */}
          <Section title="Vertrieb">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                title="Telefonate"
                value={t.telefonate}
                change={prev ? pctChange(t.telefonate, prev.telefonate ?? 0) : undefined}
                accent="from-blue-500 to-blue-600"
              />
              <StatCard
                title="Akquiriert"
                value={t.auftraegeAkquiriert}
                change={prev ? pctChange(t.auftraegeAkquiriert, prev.auftraegeAkquiriert ?? 0) : undefined}
                accent="from-violet-500 to-violet-600"
              />
              <StatCard
                title="Abschlüsse"
                value={t.auftraegeAbgeschlossen}
                change={prev ? pctChange(t.auftraegeAbgeschlossen, prev.auftraegeAbgeschlossen ?? 0) : undefined}
                subtitle={`Hit Rate: ${comp?.hitRate ?? hitRate}%`}
                accent="from-emerald-500 to-emerald-600"
              />
              <StatCard
                title="Conversion"
                value={`${comp?.conversionRate ?? conversionRate}%`}
                change={prevComp ? pctChange(comp?.conversionRate ?? conversionRate, prevComp.conversionRate) : undefined}
                accent="from-amber-500 to-amber-600"
              />
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">Vertrieb - Trend</h3>
              <KpiLineChart
                data={trendData as Record<string, unknown>[]}
                xKey="label"
                lines={[
                  { key: "telefonate", color: "#8b5cf6", name: "Telefonate" },
                  { key: "auftraegeAkquiriert", color: "#10b981", name: "Akquiriert" },
                  { key: "auftraegeAbgeschlossen", color: "#f59e0b", name: "Abschlüsse" },
                ]}
                height={280}
              />
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">Vertrieb-Funnel</h3>
              <FunnelChart
                steps={[
                  { label: "Telefonate", value: t.telefonate, color: "#3b82f6" },
                  { label: "Akquiriert", value: t.auftraegeAkquiriert, color: "#8b5cf6" },
                  { label: "Abgeschlossen", value: t.auftraegeAbgeschlossen, color: "#10b981" },
                ]}
              />
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════
              KOSTENSTELLEN
              ══════════════════════════════════════════════════════ */}
          {stats.costCenterBreakdown.length > 0 && (
            <Section title="Kostenstellen">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                <h3 className="text-xs font-semibold text-gray-700 mb-3">Vergleich nach Kostenstellen</h3>
                <KpiBarChart
                  data={stats.costCenterBreakdown.map((cc) => ({ ...cc, name: `KST ${cc.costCenter}` }))}
                  xKey="name"
                  bars={[
                    { key: "auftraegeAbgeschlossen", color: "#3b82f6", name: "Abschlüsse" },
                    { key: "deals", color: "#10b981", name: "Deals" },
                    { key: "profile", color: "#8b5cf6", name: "Profile" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Vertrieb nach Kostenstelle</h3>
                  <KpiPieChart data={costCenterPieData} donut />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Profile nach Kostenstelle</h3>
                  <KpiPieChart data={profilePieData} donut />
                </div>
              </div>
            </Section>
          )}

          {/* ══════════════════════════════════════════════════════
              JAHRESVERGLEICH
              ══════════════════════════════════════════════════════ */}
          {yearCompData.length > 0 && yearCompYears.length > 0 && (
            <Section title="Jahresvergleich">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Eintritte</h3>
                  <KpiLineChart data={yearCompData} xKey="month" lines={yearCompYears.map((year, i) => ({ key: `eintritte_${year}`, color: YEAR_COLORS[i] || "#6b7280", name: year }))} />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Austritte</h3>
                  <KpiLineChart data={yearCompData} xKey="month" lines={yearCompYears.map((year, i) => ({ key: `austritte_${year}`, color: YEAR_COLORS[i] || "#6b7280", name: year }))} />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Profile</h3>
                  <KpiLineChart data={yearCompData} xKey="month" lines={yearCompYears.map((year, i) => ({ key: `profile_${year}`, color: YEAR_COLORS[i] || "#6b7280", name: year }))} />
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Deals</h3>
                  <KpiLineChart data={yearCompData} xKey="month" lines={yearCompYears.map((year, i) => ({ key: `deals_${year}`, color: YEAR_COLORS[i] || "#6b7280", name: year }))} />
                </div>
              </div>
            </Section>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Keine Daten verfügbar.</p>
      )}
    </AppShell>
  );
}
