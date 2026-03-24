"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { KpiBarChart } from "@/components/charts/bar-chart";
import { useFilters, TIME_RANGE_LABELS } from "@/lib/filter-context";

interface Employee {
  id: string;
  name: string;
  costCenter: string;
  active: boolean;
  _count: { kpiEntries: number };
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
  profile: number;
  vorstellungsgespraeche: number;
  deals: number;
  eintritte: number;
  austritte: number;
  employee: { name: string; costCenter: string };
}

const KPI_METRICS = [
  { key: "telefonate", label: "Telefonate" },
  { key: "auftraegeAkquiriert", label: "Aufträge akquiriert" },
  { key: "auftraegeAbgeschlossen", label: "Aufträge abgeschlossen" },
  { key: "profile", label: "Profile" },
  { key: "vorstellungsgespraeche", label: "VG's" },
  { key: "deals", label: "Deals" },
  { key: "eintritte", label: "Eintritte" },
  { key: "austritte", label: "Austritte" },
] as const;

type MetricKey = (typeof KPI_METRICS)[number]["key"];

const METRIC_COLORS = [
  "#2563eb", "#059669", "#dc2626", "#7c3aed",
  "#d97706", "#0891b2", "#be185d", "#4f46e5",
];

function aggregateEntries(entries: KpiEntry[]): Record<MetricKey, number> {
  return entries.reduce(
    (acc, entry) => {
      for (const metric of KPI_METRICS) acc[metric.key] += entry[metric.key];
      return acc;
    },
    Object.fromEntries(KPI_METRICS.map((m) => [m.key, 0])) as Record<MetricKey, number>
  );
}

export default function VergleichPage() {
  const { status } = useSession();
  const router = useRouter();
  const filters = useFilters();
  const { timeRange, setTimeRange, customFrom, setCustomFrom, customTo, setCustomTo, viewMode, setViewMode, costCenter, setCostCenter, dateRange } = filters;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [employeeData, setEmployeeData] = useState<Map<string, KpiEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [rankingMetric, setRankingMetric] = useState<MetricKey>("auftraegeAbgeschlossen");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const params = new URLSearchParams({ active: "true" });
    if (costCenter !== "all") params.set("costCenter", costCenter);
    fetch(`/api/employees?${params}`).then((r) => r.json()).then((data: Employee[]) => {
      setEmployees(data);
      setSelectedIds(new Set());
      setEmployeeData(new Map());
    }).finally(() => setLoading(false));
  }, [status, costCenter]);

  const fetchSelectedData = useCallback(async () => {
    if (selectedIds.size === 0) { setEmployeeData(new Map()); return; }
    setDataLoading(true);
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const params = new URLSearchParams({
            employeeId: id,
            from: new Date(dateRange.from + "T00:00:00").toISOString(),
            to: new Date(dateRange.to + "T23:59:59").toISOString(),
          });
          const res = await fetch(`/api/kpi?${params}`);
          return { id, entries: await res.json() as KpiEntry[] };
        })
      );
      const newData = new Map<string, KpiEntry[]>();
      for (const { id, entries } of results) newData.set(id, entries);
      setEmployeeData(newData);
    } finally { setDataLoading(false); }
  }, [selectedIds, dateRange]);

  useEffect(() => { if (status === "authenticated") fetchSelectedData(); }, [fetchSelectedData, status]);

  const employeeTotals = useMemo(() => {
    const totals = new Map<string, Record<MetricKey, number>>();
    for (const [id, entries] of employeeData) totals.set(id, aggregateEntries(entries));
    return totals;
  }, [employeeData]);

  const [allEmployeeData, setAllEmployeeData] = useState<Map<string, KpiEntry[]>>(new Map());
  const [rankingLoading, setRankingLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || employees.length === 0) return;
    setRankingLoading(true);
    const params = new URLSearchParams({
      from: new Date(dateRange.from + "T00:00:00").toISOString(),
      to: new Date(dateRange.to + "T23:59:59").toISOString(),
      ...(costCenter !== "all" && { costCenter }),
    });
    fetch(`/api/kpi?${params}`).then((r) => r.json()).then((entries: KpiEntry[]) => {
      const grouped = new Map<string, KpiEntry[]>();
      for (const entry of entries) {
        const existing = grouped.get(entry.employeeId) || [];
        existing.push(entry);
        grouped.set(entry.employeeId, existing);
      }
      setAllEmployeeData(grouped);
    }).finally(() => setRankingLoading(false));
  }, [status, employees, dateRange, costCenter]);

  const rankingData = useMemo(() => {
    const rows: { id: string; name: string; value: number }[] = [];
    for (const emp of employees) {
      const entries = allEmployeeData.get(emp.id) || [];
      rows.push({ id: emp.id, name: emp.name, value: aggregateEntries(entries)[rankingMetric] });
    }
    return rows.sort((a, b) => b.value - a.value);
  }, [employees, allEmployeeData, rankingMetric]);

  const costCenterComparison = useMemo(() => {
    if (costCenter !== "all") return [];
    const byCostCenter = new Map<string, Record<MetricKey, number>>();
    for (const entries of allEmployeeData.values()) {
      for (const entry of entries) {
        const existing = byCostCenter.get(entry.costCenter) || (Object.fromEntries(KPI_METRICS.map((m) => [m.key, 0])) as Record<MetricKey, number>);
        for (const metric of KPI_METRICS) existing[metric.key] += entry[metric.key];
        byCostCenter.set(entry.costCenter, existing);
      }
    }
    return Array.from(byCostCenter.entries()).map(([cc, data]) => ({ name: `KST ${cc}`, ...data })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allEmployeeData, costCenter]);

  const selectedEmployees = useMemo(() => employees.filter((e) => selectedIds.has(e.id)), [employees, selectedIds]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const comparisonChartData = useMemo(() => {
    return KPI_METRICS.map((metric) => {
      const row: Record<string, string | number> = { metric: metric.label };
      for (const emp of selectedEmployees) { const totals = employeeTotals.get(emp.id); row[emp.name] = totals ? totals[metric.key] : 0; }
      return row;
    });
  }, [selectedEmployees, employeeTotals]);

  if (status === "loading" || status === "unauthenticated") return <Loading text="Laden..." />;

  return (
    <AppShell pageTitle="Mitarbeiter-Vergleich">
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as typeof timeRange)} className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
          {Object.entries(TIME_RANGE_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
        </select>
        {timeRange === "custom" && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="bg-white border rounded-lg px-2 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <span className="text-sm text-gray-400">bis</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="bg-white border rounded-lg px-2 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        )}
        <div className="flex bg-white rounded-lg border shadow-sm">
          {(["week", "month"] as const).map((vm, i, arr) => (
            <button key={vm} onClick={() => setViewMode(vm)} className={`px-4 py-2 text-sm font-medium transition ${viewMode === vm ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"} ${i === 0 ? "rounded-l-lg" : ""} ${i === arr.length - 1 ? "rounded-r-lg" : ""}`}>
              {vm === "week" ? "je Woche" : "je Monat"}
            </button>
          ))}
        </div>
        <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">Alle Kostenstellen</option>
          <option value="330">KST 330</option>
          <option value="350">KST 350</option>
          <option value="370">KST 370</option>
        </select>
      </div>

      {loading ? <Loading text="Mitarbeiter werden geladen..." /> : (
        <>
          <Card title="Mitarbeiter auswählen" subtitle="Wählen Sie mindestens 2 Mitarbeiter zum Vergleich">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {employees.map((emp) => (
                <label key={emp.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition border ${selectedIds.has(emp.id) ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={selectedIds.has(emp.id)} onChange={() => toggleEmployee(emp.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{emp.name}</div>
                    <div className="text-xs text-gray-500">KST {emp.costCenter}</div>
                  </div>
                </label>
              ))}
            </div>
            {employees.length === 0 && <p className="text-sm text-gray-500">Keine Mitarbeiter gefunden.</p>}
          </Card>

          {selectedIds.size >= 2 && (
            <>
              {dataLoading ? <div className="mt-6"><Loading text="Vergleichsdaten werden geladen..." /></div> : (
                <>
                  <Card title="Kennzahlen-Vergleich" className="mt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Kennzahl</th>
                            {selectedEmployees.map((emp) => (<th key={emp.id} className="text-right py-3 px-4 font-semibold text-gray-700">{emp.name}</th>))}
                            <th className="text-right py-3 px-4 font-semibold text-gray-900 bg-gray-50">Gesamt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {KPI_METRICS.map((metric) => {
                            const total = selectedEmployees.reduce((sum, emp) => sum + (employeeTotals.get(emp.id)?.[metric.key] ?? 0), 0);
                            return (
                              <tr key={metric.key} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-700">{metric.label}</td>
                                {selectedEmployees.map((emp) => {
                                  const value = employeeTotals.get(emp.id)?.[metric.key] ?? 0;
                                  const isMax = selectedEmployees.length > 1 && value > 0 && value === Math.max(...selectedEmployees.map((e) => employeeTotals.get(e.id)?.[metric.key] ?? 0));
                                  return <td key={emp.id} className={`text-right py-3 px-4 tabular-nums ${isMax ? "font-bold text-green-700" : "text-gray-600"}`}>{value.toLocaleString("de-DE")}</td>;
                                })}
                                <td className="text-right py-3 px-4 font-semibold text-gray-900 bg-gray-50 tabular-nums">{total.toLocaleString("de-DE")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                  <Card title="Vergleich - Balkendiagramm" className="mt-6">
                    <KpiBarChart data={comparisonChartData} xKey="metric" bars={selectedEmployees.map((emp, i) => ({ key: emp.name, color: METRIC_COLORS[i % METRIC_COLORS.length], name: emp.name }))} height={400} />
                  </Card>
                </>
              )}
            </>
          )}

          {selectedIds.size === 1 && (
            <div className="mt-6 text-center py-8 text-gray-500 bg-white rounded-xl border shadow-sm">
              <p className="text-sm">Bitte wählen Sie mindestens einen weiteren Mitarbeiter zum Vergleich aus.</p>
            </div>
          )}

          <Card title="Mitarbeiter-Ranking" className="mt-6">
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mr-2">Sortieren nach:</label>
              <select value={rankingMetric} onChange={(e) => setRankingMetric(e.target.value as MetricKey)} className="bg-white border rounded-lg px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                {KPI_METRICS.map((metric) => (<option key={metric.key} value={metric.key}>{metric.label}</option>))}
              </select>
            </div>
            {rankingLoading ? <Loading text="Ranking wird berechnet..." size="sm" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 w-16">Rang</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Mitarbeiter</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">{KPI_METRICS.find((m) => m.key === rankingMetric)?.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingData.map((row, index) => (
                      <tr key={row.id} className={`border-b border-gray-100 ${index === 0 && row.value > 0 ? "bg-yellow-50" : "hover:bg-gray-50"}`}>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${index === 0 && row.value > 0 ? "bg-yellow-400 text-yellow-900" : index === 1 && row.value > 0 ? "bg-gray-300 text-gray-800" : index === 2 && row.value > 0 ? "bg-orange-300 text-orange-900" : "bg-gray-100 text-gray-600"}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{row.name}</td>
                        <td className="text-right py-3 px-4 tabular-nums text-gray-700 font-medium">{row.value.toLocaleString("de-DE")}</td>
                      </tr>
                    ))}
                    {rankingData.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-gray-500">Keine Daten vorhanden.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {costCenter === "all" && costCenterComparison.length > 0 && (
            <Card title="Vergleich nach Kostenstellen" className="mt-6">
              <KpiBarChart data={costCenterComparison} xKey="name" bars={[
                { key: "auftraegeAbgeschlossen", color: "#059669", name: "Abschlüsse" },
                { key: "deals", color: "#dc2626", name: "Deals" }, { key: "profile", color: "#7c3aed", name: "Profile" },
              ]} height={350} stacked={false} />
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}
