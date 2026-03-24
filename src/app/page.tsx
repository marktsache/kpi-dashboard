"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Loading } from "@/components/ui/loading";
import { KpiLineChart } from "@/components/charts/line-chart";
import { KpiBarChart } from "@/components/charts/bar-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";

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

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [costCenter, setCostCenter] = useState("all");
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const now = new Date();
    const from = new Date();
    if (timeRange === "week") from.setDate(now.getDate() - 7);
    else if (timeRange === "month") from.setMonth(now.getMonth() - 1);
    else if (timeRange === "quarter") from.setMonth(now.getMonth() - 3);
    else if (timeRange === "year") from.setFullYear(now.getFullYear() - 1);

    const params = new URLSearchParams({
      from: from.toISOString(),
      to: now.toISOString(),
      ...(costCenter !== "all" && { costCenter }),
    });

    fetch(`/api/kpi/stats?${params}`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [status, costCenter, timeRange]);

  if (status === "loading" || status === "unauthenticated") {
    return <Loading text="Laden..." />;
  }

  return (
    <AppShell pageTitle="Dashboard">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
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
              {range === "week" ? "Woche" : range === "month" ? "Monat" : range === "quarter" ? "Quartal" : "Jahr"}
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
      </div>

      {loading ? (
        <Loading text="Daten werden geladen..." />
      ) : stats ? (
        <>
          {/* KPI Cards Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Kundenkontakte"
              value={stats.computed.kontakte}
              subtitle={`${stats.totals.kundenbesuche} Besuche + ${stats.totals.telefonate} Telefonate`}
            />
            <StatCard
              title="Aufträge akquiriert"
              value={stats.totals.auftraegeAkquiriert}
              subtitle={`Hit Rate: ${stats.computed.hitRate}%`}
            />
            <StatCard
              title="Abschlüsse"
              value={stats.totals.auftraegeAbgeschlossen}
              subtitle={`Conversion: ${stats.computed.conversionRate}%`}
            />
            <StatCard
              title="Externe Einstellungen"
              value={stats.totals.externeEinstellungen}
              subtitle={`Besetzungsquote: ${stats.computed.besetzungsquote}%`}
            />
          </div>

          {/* KPI Cards Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Profile verschickt"
              value={stats.totals.profileVerschickt}
              subtitle={`Ø ${stats.computed.profileProBesetzung} pro Besetzung`}
            />
            <StatCard
              title="Vorstellungsgespräche"
              value={stats.totals.vorstellungsgespraeche}
            />
            <StatCard
              title="Netto-Veränderung Personal"
              value={stats.computed.nettoVeraenderung}
              trend={stats.computed.nettoVeraenderung >= 0 ? "up" : "down"}
              subtitle={`${stats.totals.eintritte} Eintritte / ${stats.totals.austritte} Austritte`}
            />
            <StatCard
              title="Fluktuationsrate"
              value={`${stats.computed.fluktuationsrate}%`}
              trend={stats.computed.fluktuationsrate > 50 ? "down" : "up"}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vertrieb - Trend</h3>
              <KpiLineChart
                data={stats.trends}
                xKey="date"
                lines={[
                  { key: "kundenbesuche", color: "#2563eb", name: "Kundenbesuche" },
                  { key: "telefonate", color: "#7c3aed", name: "Telefonate" },
                  { key: "auftraegeAkquiriert", color: "#059669", name: "Akquiriert" },
                  { key: "auftraegeAbgeschlossen", color: "#dc2626", name: "Abgeschlossen" },
                ]}
              />
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recruiting - Trend</h3>
              <KpiLineChart
                data={stats.trends}
                xKey="date"
                lines={[
                  { key: "profileVerschickt", color: "#2563eb", name: "Profile" },
                  { key: "vorstellungsgespraeche", color: "#7c3aed", name: "VG" },
                  { key: "externeEinstellungen", color: "#059669", name: "Einstellungen" },
                ]}
              />
            </div>
          </div>

          {/* Funnels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vertrieb-Funnel</h3>
              <FunnelChart
                steps={[
                  { label: "Kontakte", value: stats.computed.kontakte, color: "#3b82f6" },
                  { label: "Akquiriert", value: stats.totals.auftraegeAkquiriert, color: "#8b5cf6" },
                  { label: "Abgeschlossen", value: stats.totals.auftraegeAbgeschlossen, color: "#10b981" },
                ]}
              />
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recruiting-Funnel</h3>
              <FunnelChart
                steps={[
                  { label: "Profile", value: stats.totals.profileVerschickt, color: "#3b82f6" },
                  { label: "VG", value: stats.totals.vorstellungsgespraeche, color: "#8b5cf6" },
                  { label: "Einstellungen", value: stats.totals.externeEinstellungen, color: "#10b981" },
                ]}
              />
            </div>
          </div>

          {/* Cost Center Comparison */}
          {stats.costCenterBreakdown.length > 0 && (
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vergleich nach Kostenstellen</h3>
              <KpiBarChart
                data={stats.costCenterBreakdown.map((cc) => ({
                  ...cc,
                  name: `KST ${cc.costCenter}`,
                }))}
                xKey="name"
                bars={[
                  { key: "auftraegeAbgeschlossen", color: "#2563eb", name: "Abschlüsse" },
                  { key: "externeEinstellungen", color: "#059669", name: "Einstellungen" },
                  { key: "profileVerschickt", color: "#7c3aed", name: "Profile" },
                ]}
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500">Keine Daten verfügbar.</p>
      )}
    </AppShell>
  );
}
