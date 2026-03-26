"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useFilters, TIME_RANGE_LABELS } from "@/lib/filter-context";
import { useKpiEntry } from "@/lib/kpi-entry-context";
import { Badge, kstColor } from "@/components/ui/badge";

interface KpiEntry {
  id: string;
  employeeId: string;
  date: string;
  profile: number;
  vorstellungsgespraeche: number;
  deals: number;
  eintritte: number;
  austritte: number;
  employee: {
    id: string;
    name: string;
    costCenter: string;
  };
}

interface EmployeeRow {
  employeeId: string;
  name: string;
  costCenter: string;
  profile: number;
  vorstellungsgespraeche: number;
  deals: number;
  vgQuote: number;
  dealQuote: number;
  eintritte: number;
  austritte: number;
  maWachstum: number;
}

interface MissingMonthDetail {
  employeeId: string;
  employeeName: string;
  missingMonths: Array<{ month: number; label: string }>;
}

const KPI_RANKING_METRICS = [
  { key: "profile", label: "Profile" },
  { key: "vorstellungsgespraeche", label: "VG's" },
  { key: "deals", label: "Deals" },
  { key: "eintritte", label: "Eintritte" },
] as const;

function fmt(n: number): string {
  return n.toLocaleString("de-DE");
}

function fmtPct(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const { timeRange, setTimeRange, costCenter, setCostCenter, dateRange } = useFilters();
  const { openKpiEntry } = useKpiEntry();

  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingMonths, setMissingMonths] = useState<MissingMonthDetail[]>([]);
  const [rankingMetric, setRankingMetric] = useState<string>("profile");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Fetch KPI entries
  const fetchData = useCallback(() => {
    if (status !== "authenticated" || !dateRange.from || !dateRange.to) return;
    setLoading(true);
    const params = new URLSearchParams({
      from: new Date(dateRange.from + "T00:00:00").toISOString(),
      to: new Date(dateRange.to + "T23:59:59").toISOString(),
      ...(costCenter !== "all" && { costCenter }),
    });
    fetch(`/api/kpi?${params}`)
      .then((r) => r.json())
      .then((data) => setEntries(data))
      .finally(() => setLoading(false));
  }, [status, dateRange, costCenter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch missing months
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/kpi/missing-weeks")
      .then((r) => r.json())
      .then((data) => setMissingMonths(data.details || []))
      .catch(() => setMissingMonths([]));
  }, [status]);

  // Refresh on kpi-entry-saved event
  useEffect(() => {
    const handler = () => {
      fetchData();
      fetch("/api/kpi/missing-weeks")
        .then((r) => r.json())
        .then((data) => setMissingMonths(data.details || []))
        .catch(() => {});
    };
    window.addEventListener("kpi-entry-saved", handler);
    return () => window.removeEventListener("kpi-entry-saved", handler);
  }, [fetchData]);

  // Aggregate entries by employee
  const employeeRows = useMemo<EmployeeRow[]>(() => {
    const byEmployee = new Map<string, { name: string; costCenter: string; profile: number; vg: number; deals: number; eintritte: number; austritte: number }>();
    for (const entry of entries) {
      const emp = byEmployee.get(entry.employeeId) || {
        name: entry.employee?.name || "Unbekannt",
        costCenter: entry.employee?.costCenter || "–",
        profile: 0,
        vg: 0,
        deals: 0,
        eintritte: 0,
        austritte: 0,
      };
      emp.profile += entry.profile || 0;
      emp.vg += entry.vorstellungsgespraeche || 0;
      emp.deals += entry.deals || 0;
      emp.eintritte += entry.eintritte || 0;
      emp.austritte += entry.austritte || 0;
      byEmployee.set(entry.employeeId, emp);
    }
    return Array.from(byEmployee.entries()).map(([employeeId, d]) => ({
      employeeId,
      name: d.name,
      costCenter: d.costCenter,
      profile: d.profile,
      vorstellungsgespraeche: d.vg,
      deals: d.deals,
      vgQuote: d.profile > 0 ? (d.vg / d.profile) * 100 : 0,
      dealQuote: d.profile > 0 ? (d.deals / d.profile) * 100 : 0,
      eintritte: d.eintritte,
      austritte: d.austritte,
      maWachstum: d.eintritte - d.austritte,
    }));
  }, [entries]);

  // Averages
  const averages = useMemo(() => {
    const n = employeeRows.length;
    if (n === 0) return null;
    const sum = (fn: (r: EmployeeRow) => number) => employeeRows.reduce((s, r) => s + fn(r), 0);
    const totalProfile = sum((r) => r.profile);
    const totalVg = sum((r) => r.vorstellungsgespraeche);
    const totalDeals = sum((r) => r.deals);
    return {
      profile: totalProfile / n,
      vorstellungsgespraeche: totalVg / n,
      deals: totalDeals / n,
      vgQuote: totalProfile > 0 ? (totalVg / totalProfile) * 100 : 0,
      dealQuote: totalProfile > 0 ? (totalDeals / totalProfile) * 100 : 0,
      eintritte: sum((r) => r.eintritte) / n,
      austritte: sum((r) => r.austritte) / n,
      maWachstum: sum((r) => r.maWachstum) / n,
    };
  }, [employeeRows]);

  // Totals
  const totals = useMemo(() => {
    const sum = (fn: (r: EmployeeRow) => number) => employeeRows.reduce((s, r) => s + fn(r), 0);
    const totalProfile = sum((r) => r.profile);
    const totalVg = sum((r) => r.vorstellungsgespraeche);
    const totalDeals = sum((r) => r.deals);
    return {
      profile: totalProfile,
      vorstellungsgespraeche: totalVg,
      deals: totalDeals,
      vgQuote: totalProfile > 0 ? (totalVg / totalProfile) * 100 : 0,
      dealQuote: totalProfile > 0 ? (totalDeals / totalProfile) * 100 : 0,
      eintritte: sum((r) => r.eintritte),
      austritte: sum((r) => r.austritte),
      maWachstum: sum((r) => r.eintritte) - sum((r) => r.austritte),
    };
  }, [employeeRows]);

  // Ranking data
  const rankingData = useMemo(() => {
    return employeeRows
      .map((r) => ({
        name: r.name,
        value: r[rankingMetric as keyof EmployeeRow] as number,
      }))
      .sort((a, b) => b.value - a.value);
  }, [employeeRows, rankingMetric]);

  if (status === "loading" || status === "unauthenticated") {
    return <AppShell pageTitle="Dashboard"><DashboardSkeleton /></AppShell>;
  }

  const selectClass = "bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-gray-600";

  const maxRankingValue = rankingData.length > 0 ? Math.max(...rankingData.map((r) => r.value), 1) : 1;

  const totalMissingCount = missingMonths.reduce((sum, d) => sum + d.missingMonths.length, 0);

  // Helper: color class for above/below average
  function aboveAvgClass(value: number, avg: number | undefined): string {
    if (avg === undefined || avg === 0) return "text-gray-900";
    if (value > avg) return "text-emerald-600 font-semibold";
    if (value < avg) return "text-red-500 font-semibold";
    return "text-gray-900";
  }

  function wachstumClass(value: number): string {
    if (value > 0) return "text-emerald-600 font-semibold";
    if (value < 0) return "text-red-500 font-semibold";
    return "text-gray-900";
  }

  return (
    <AppShell pageTitle="Dashboard">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as typeof timeRange)} className={selectClass}>
          {Object.entries(TIME_RANGE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className={selectClass}>
          <option value="all">Alle Kostenstellen</option>
          <option value="330">KST 330</option>
          <option value="350">KST 350</option>
          <option value="370">KST 370</option>
        </select>
        <button
          onClick={() => openKpiEntry()}
          className="ml-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[11px] font-semibold px-3.5 py-1.5 rounded-lg shadow-card hover:shadow-card-hover transition-all duration-200 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          KPI erfassen
        </button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="chart"
          title="Keine KPI-Daten gefunden"
          description="Passen Sie den Zeitraum oder die Filter an, oder erfassen Sie neue KPI-Daten."
          action={{ label: "KPI erfassen", onClick: () => openKpiEntry() }}
        />
      ) : (
        <div className="space-y-6">
          {/* ── Comparison Table ── */}
          <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Mitarbeiter</th>
                    <th className="text-center px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">KST</th>
                    <th className="text-right px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Profile</th>
                    <th className="text-right px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">VG&apos;s</th>
                    <th className="text-right px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Deals</th>
                    <th className="text-right px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">VG-Quote</th>
                    <th className="text-right px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Deal-Quote</th>
                    <th className="text-right px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Eintritte</th>
                    <th className="text-right px-2 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Austritte</th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">MA-Wachstum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employeeRows.map((row) => (
                    <tr key={row.employeeId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2">
                        <Link href={`/mitarbeiter/${row.employeeId}`} className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          {row.name}
                        </Link>
                      </td>
                      <td className="text-center px-2 py-2"><Badge color={kstColor(row.costCenter)}>{row.costCenter}</Badge></td>
                      <td className={`text-right px-2 py-2 text-xs ${aboveAvgClass(row.profile, averages?.profile)}`}>{fmt(row.profile)}</td>
                      <td className={`text-right px-2 py-2 text-xs ${aboveAvgClass(row.vorstellungsgespraeche, averages?.vorstellungsgespraeche)}`}>{fmt(row.vorstellungsgespraeche)}</td>
                      <td className={`text-right px-2 py-2 text-xs ${aboveAvgClass(row.deals, averages?.deals)}`}>{fmt(row.deals)}</td>
                      <td className="text-right px-2 py-2 text-xs text-gray-900">{row.profile === 0 ? "–" : fmtPct(row.vgQuote)}</td>
                      <td className="text-right px-2 py-2 text-xs text-gray-900">{row.profile === 0 ? "–" : fmtPct(row.dealQuote)}</td>
                      <td className={`text-right px-2 py-2 text-xs ${aboveAvgClass(row.eintritte, averages?.eintritte)}`}>{fmt(row.eintritte)}</td>
                      <td className="text-right px-2 py-2 text-xs text-gray-900">{fmt(row.austritte)}</td>
                      <td className={`text-right px-3 py-2 text-xs ${wachstumClass(row.maWachstum)}`}>
                        {row.maWachstum > 0 ? "+" : ""}{fmt(row.maWachstum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {averages && (
                  <tfoot>
                    {/* Durchschnitt row */}
                    <tr className="bg-blue-50/50 border-t border-gray-200">
                      <td className="px-3 py-2 text-xs font-semibold text-gray-600">Durchschnitt (Ø)</td>
                      <td className="text-center px-2 py-2 text-[11px] text-gray-400">–</td>
                      <td className="text-right px-2 py-2 text-xs font-medium text-gray-700">{averages.profile.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</td>
                      <td className="text-right px-2 py-2 text-xs font-medium text-gray-700">{averages.vorstellungsgespraeche.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</td>
                      <td className="text-right px-2 py-2 text-xs font-medium text-gray-700">{averages.deals.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</td>
                      <td className="text-right px-2 py-2 text-xs font-medium text-gray-700">{fmtPct(averages.vgQuote)}</td>
                      <td className="text-right px-2 py-2 text-xs font-medium text-gray-700">{fmtPct(averages.dealQuote)}</td>
                      <td className="text-right px-2 py-2 text-xs font-medium text-gray-700">{averages.eintritte.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</td>
                      <td className="text-right px-2 py-2 text-xs font-medium text-gray-700">{averages.austritte.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</td>
                      <td className={`text-right px-3 py-2 text-xs font-medium ${wachstumClass(averages.maWachstum)}`}>
                        {averages.maWachstum > 0 ? "+" : ""}{averages.maWachstum.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
                      </td>
                    </tr>
                    {/* Gesamt row */}
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="px-3 py-2 text-xs font-bold text-gray-800">Gesamt</td>
                      <td className="text-center px-2 py-2 text-[11px] text-gray-400">–</td>
                      <td className="text-right px-2 py-2 text-xs font-bold text-gray-800">{fmt(totals.profile)}</td>
                      <td className="text-right px-2 py-2 text-xs font-bold text-gray-800">{fmt(totals.vorstellungsgespraeche)}</td>
                      <td className="text-right px-2 py-2 text-xs font-bold text-gray-800">{fmt(totals.deals)}</td>
                      <td className="text-right px-2 py-2 text-xs font-bold text-gray-800">{fmtPct(totals.vgQuote)}</td>
                      <td className="text-right px-2 py-2 text-xs font-bold text-gray-800">{fmtPct(totals.dealQuote)}</td>
                      <td className="text-right px-2 py-2 text-xs font-bold text-gray-800">{fmt(totals.eintritte)}</td>
                      <td className="text-right px-2 py-2 text-xs font-bold text-gray-800">{fmt(totals.austritte)}</td>
                      <td className={`text-right px-3 py-2 text-xs font-bold ${wachstumClass(totals.maWachstum)}`}>
                        {totals.maWachstum > 0 ? "+" : ""}{fmt(totals.maWachstum)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ── Missing Months Warning ── */}
          {totalMissingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-amber-800 mb-2">
                    {totalMissingCount} fehlende {totalMissingCount === 1 ? "Monat" : "Monate"}
                  </h3>
                  <div className="space-y-1.5">
                    {missingMonths.filter((d) => d.missingMonths.length > 0).map((detail) => (
                      <div key={detail.employeeId} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-amber-700 w-20">{detail.employeeName}:</span>
                        <div className="flex flex-wrap gap-1">
                          {detail.missingMonths.map((m) => (
                            <button
                              key={m.month}
                              onClick={() => router.push(`/mitarbeiter/${detail.employeeId}`)}
                              className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Ranking ── */}
          <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Ranking
              </h2>
              <select
                value={rankingMetric}
                onChange={(e) => setRankingMetric(e.target.value)}
                className={selectClass}
              >
                {KPI_RANKING_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            {rankingData.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Keine Daten vorhanden</p>
            ) : (
              <div className="space-y-2.5">
                {rankingData.map((row, i) => (
                  <div key={row.name} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-right ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-gray-300"}`}>
                      {i + 1}.
                    </span>
                    <span className="text-xs font-medium text-gray-700 w-20 truncate">{row.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 flex items-center px-2 ${
                          i === 0 ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                          i === 1 ? "bg-gradient-to-r from-blue-400 to-blue-500" :
                          i === 2 ? "bg-gradient-to-r from-blue-300 to-blue-400" :
                          "bg-gray-300"
                        }`}
                        style={{ width: `${Math.max((row.value / maxRankingValue) * 100, 8)}%` }}
                      >
                        <span className="text-[11px] font-bold text-white">{fmt(row.value)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
