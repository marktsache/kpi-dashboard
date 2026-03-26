"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge, kstColor } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { SkeletonStatCard, SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Employee {
  id: string;
  name: string;
  costCenter: string;
  photoUrl: string | null;
  jobTitle: string | null;
  startDate: string | null;
  active: boolean;
}

interface KpiEntry {
  id: string;
  employeeId: string;
  date: string;
  profile: number | null;
  vorstellungsgespraeche: number | null;
  deals: number | null;
  eintritte: number | null;
  austritte: number | null;
  costCenter: string;
  comment?: string | null;
}

interface MonthBucket {
  profile: number | null;
  deals: number | null;
  eintritte: number | null;
  austritte: number | null;
}

interface MonthRow {
  key: string;
  monthIndex: number;
  label: string;
  isCurrent: boolean;
  isEmpty: boolean; // true if NO field has data at all
  isBeforeStart: boolean;
  profile: number | null;
  deals: number | null;
  dealQuote: number | null;
  eintritte: number | null;
  austritte: number | null;
  maWachstum: number | null;
}

interface YearRow {
  year: number;
  isCurrent: boolean;
  profile: number;
  deals: number;
  dealQuote: number;
  eintritte: number;
  austritte: number;
  maWachstum: number;
  vsVorjahr: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTH_NAMES_FULL = ["Januar", "Februar", "M\u00e4rz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function fmt(n: number): string {
  return n.toLocaleString("de-DE");
}

function fmtDec(n: number, digits = 1): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n: number): string {
  return fmtDec(n) + "%";
}

function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0) return current > 0 ? 100 : undefined;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Year comparison chart color palettes
const PROFILE_COLORS: Record<number, string> = {
  0: "#c2410c", // aktuelles Jahr: dunkles Orange
  1: "#f97316",
  2: "#fb923c",
  3: "#fdba74",
  4: "#fed7aa",
  5: "#ffedd5",
};

const DEALS_COLORS: Record<number, string> = {
  0: "#581c87", // aktuelles Jahr: dunkles Lila
  1: "#8b5cf6",
  2: "#a78bfa",
  3: "#c4b5fd",
  4: "#ddd6fe",
  5: "#ede9fe",
};

const EINTRITTE_COLORS: Record<number, string> = {
  0: "#14532d", // aktuelles Jahr: dunkles Grün
  1: "#16a34a",
  2: "#4ade80",
  3: "#86efac",
  4: "#bbf7d0",
  5: "#dcfce7",
};

const AUSTRITTE_COLORS: Record<number, string> = {
  0: "#7f1d1d", // aktuelles Jahr: dunkles Rot
  1: "#dc2626",
  2: "#f87171",
  3: "#fca5a5",
  4: "#fecaca",
  5: "#fee2e2",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MitarbeiterDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const toast = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [closedMonths, setClosedMonths] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<number, { profile: string; deals: string; eintritte: string; austritte: string }>>({});

  // Year selector for Monatsübersicht
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ---- Fetch employee + all entries + stats ----
  const fetchData = useCallback(() => {
    if (status !== "authenticated" || !id) return;
    setLoading(true);

    const empPromise = fetch(`/api/employees/${id}`).then((r) => r.json());
    const entriesPromise = fetch(`/api/kpi?employeeId=${id}`).then((r) => r.json());
    const closedPromise = fetch(`/api/closed-months?employeeId=${id}`).then((r) => r.json());

    Promise.all([empPromise, entriesPromise, closedPromise])
      .then(([empData, entriesData, closedData]) => {
        if (empData.error) {
          router.push("/");
          return;
        }
        setEmployee(empData);
        setEntries(Array.isArray(entriesData) ? entriesData : empData.kpiEntries || []);
        if (Array.isArray(closedData)) {
          setClosedMonths(new Set(closedData.map((c: { year: number; month: number }) => `${c.year}-${c.month}`)));
        }
      })
      .finally(() => setLoading(false));
  }, [status, id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener("kpi-entry-saved", handler);
    return () => window.removeEventListener("kpi-entry-saved", handler);
  }, [fetchData]);

  // ---- Available years from data ----
  const availableYears = useMemo((): number[] => {
    const years = new Set<number>();
    years.add(new Date().getFullYear()); // Always include current year
    for (const entry of entries) {
      years.add(new Date(entry.date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  // ---- Aggregate entries by month for selected year ----
  const monthRows = useMemo((): MonthRow[] => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Build buckets for the selected year – keep null semantics per field
    const buckets = new Map<number, MonthBucket>();

    for (const entry of entries) {
      const d = new Date(entry.date);
      if (d.getFullYear() !== selectedYear) continue;
      const month = d.getMonth();
      const existing = buckets.get(month) || { profile: null, deals: null, eintritte: null, austritte: null };
      // Only add if the field is non-null; accumulate when multiple entries exist for same month
      if (entry.profile !== null) existing.profile = (existing.profile ?? 0) + entry.profile;
      if (entry.deals !== null) existing.deals = (existing.deals ?? 0) + entry.deals;
      if (entry.eintritte !== null) existing.eintritte = (existing.eintritte ?? 0) + entry.eintritte;
      if (entry.austritte !== null) existing.austritte = (existing.austritte ?? 0) + entry.austritte;
      buckets.set(month, existing);
    }

    // Determine start month for employee
    let startYear = 0;
    let startMonth = 0;
    if (employee?.startDate) {
      const sd = new Date(employee.startDate);
      startYear = sd.getFullYear();
      startMonth = sd.getMonth();
    }

    // Create rows for all 12 months
    const rows: MonthRow[] = [];
    for (let m = 0; m < 12; m++) {
      const data = buckets.get(m);
      const isCurrent = selectedYear === currentYear && m === currentMonth;
      // isEmpty = no field has any data at all for this month
      const isEmpty = !data || (data.profile === null && data.deals === null && data.eintritte === null && data.austritte === null);
      const isBeforeStart = employee?.startDate
        ? (selectedYear < startYear || (selectedYear === startYear && m < startMonth))
        : false;
      const profile = data?.profile ?? null;
      const deals = data?.deals ?? null;
      const eintritte = data?.eintritte ?? null;
      const austritte = data?.austritte ?? null;
      const hasEinAus = eintritte !== null && austritte !== null;

      rows.push({
        key: `${selectedYear}-${String(m).padStart(2, "0")}`,
        monthIndex: m,
        label: `${MONTH_NAMES_FULL[m]} ${selectedYear}`,
        isCurrent,
        isEmpty,
        isBeforeStart,
        profile,
        deals,
        dealQuote: profile !== null && profile > 0 && deals !== null ? (deals / profile) * 100 : null,
        eintritte,
        austritte,
        maWachstum: hasEinAus ? eintritte - austritte : null,
      });
    }

    return rows;
  }, [entries, selectedYear, employee]);

  // ---- Year average for Monatsübersicht (per-field) ----
  const yearAvg = useMemo(() => {
    const pMonths = monthRows.filter((r) => r.profile !== null);
    const dMonths = monthRows.filter((r) => r.deals !== null);
    const eMonths = monthRows.filter((r) => r.eintritte !== null);
    const aMonths = monthRows.filter((r) => r.austritte !== null);
    if (!pMonths.length && !dMonths.length && !eMonths.length && !aMonths.length) return null;

    const avgProfile = pMonths.length ? pMonths.reduce((s, r) => s + (r.profile ?? 0), 0) / pMonths.length : null;
    const avgDeals = dMonths.length ? dMonths.reduce((s, r) => s + (r.deals ?? 0), 0) / dMonths.length : null;
    const avgEintritte = eMonths.length ? eMonths.reduce((s, r) => s + (r.eintritte ?? 0), 0) / eMonths.length : null;
    const avgAustritte = aMonths.length ? aMonths.reduce((s, r) => s + (r.austritte ?? 0), 0) / aMonths.length : null;

    return {
      profile: avgProfile,
      deals: avgDeals,
      dealQuote: avgProfile && avgProfile > 0 && avgDeals !== null ? (avgDeals / avgProfile) * 100 : null,
      eintritte: avgEintritte,
      austritte: avgAustritte,
      maWachstum: avgEintritte !== null && avgAustritte !== null ? avgEintritte - avgAustritte : null,
    };
  }, [monthRows]);

  // ---- Year total for Monatsübersicht ----
  const yearTotal = useMemo(() => {
    const hasAny = monthRows.some((r) => !r.isEmpty);
    if (!hasAny) return null;

    const sumProfile = monthRows.reduce((s, r) => s + (r.profile ?? 0), 0);
    const sumDeals = monthRows.reduce((s, r) => s + (r.deals ?? 0), 0);
    const sumEintritte = monthRows.reduce((s, r) => s + (r.eintritte ?? 0), 0);
    const sumAustritte = monthRows.reduce((s, r) => s + (r.austritte ?? 0), 0);

    return {
      profile: sumProfile,
      deals: sumDeals,
      dealQuote: sumProfile > 0 ? (sumDeals / sumProfile) * 100 : 0,
      eintritte: sumEintritte,
      austritte: sumAustritte,
      maWachstum: sumEintritte - sumAustritte,
    };
  }, [monthRows]);

  // ---- Aggregate entries by year ----
  const yearRows = useMemo((): YearRow[] => {
    if (!entries.length) return [];

    const now = new Date();
    const currentYear = now.getFullYear();

    const buckets = new Map<number, { profile: number; deals: number; eintritte: number; austritte: number }>();

    for (const entry of entries) {
      const year = new Date(entry.date).getFullYear();
      const existing = buckets.get(year) || { profile: 0, deals: 0, eintritte: 0, austritte: 0 };
      existing.profile += entry.profile ?? 0;
      existing.deals += entry.deals ?? 0;
      existing.eintritte += entry.eintritte ?? 0;
      existing.austritte += entry.austritte ?? 0;
      buckets.set(year, existing);
    }

    const years = Array.from(buckets.keys()).sort((a, b) => b - a);
    const rows: YearRow[] = [];

    for (const year of years) {
      const data = buckets.get(year)!;
      const isCurrent = year === currentYear;

      let vsVorjahr: number | null = null;
      if (isCurrent) {
        const prevYearData = buckets.get(year - 1);
        if (prevYearData && prevYearData.profile > 0) {
          const monthsElapsed = now.getMonth() + 1;
          const projectedAnnual = (data.profile / monthsElapsed) * 12;
          vsVorjahr = Math.round(((projectedAnnual - prevYearData.profile) / prevYearData.profile) * 1000) / 10;
        }
      }

      rows.push({
        year,
        isCurrent,
        profile: data.profile,
        deals: data.deals,
        dealQuote: data.profile > 0 ? (data.deals / data.profile) * 100 : 0,
        eintritte: data.eintritte,
        austritte: data.austritte,
        maWachstum: data.eintritte - data.austritte,
        vsVorjahr,
      });
    }

    return rows;
  }, [entries]);

  // ---- Year average for Jahresübersicht (only completed years, not current) ----
  const allYearsAvg = useMemo(() => {
    const completedYears = yearRows.filter((r) => !r.isCurrent);
    if (!completedYears.length) return null;
    const n = completedYears.length;
    const sum = completedYears.reduce(
      (acc, r) => ({
        profile: acc.profile + r.profile,
        deals: acc.deals + r.deals,
        eintritte: acc.eintritte + r.eintritte,
        austritte: acc.austritte + r.austritte,
      }),
      { profile: 0, deals: 0, eintritte: 0, austritte: 0 }
    );
    const avgProfile = sum.profile / n;
    const avgDeals = sum.deals / n;
    const avgEintritte = sum.eintritte / n;
    const avgAustritte = sum.austritte / n;
    return {
      profile: avgProfile,
      deals: avgDeals,
      dealQuote: avgProfile > 0 ? (avgDeals / avgProfile) * 100 : 0,
      eintritte: avgEintritte,
      austritte: avgAustritte,
      maWachstum: avgEintritte - avgAustritte,
    };
  }, [yearRows]);

  // ---- Year comparison chart data ----
  const yearCompChartData = useMemo(() => {
    if (!entries.length) return { data: [], years: [] as number[] };

    const yearSet = new Set<number>();
    for (const entry of entries) {
      yearSet.add(new Date(entry.date).getFullYear());
    }
    const years = Array.from(yearSet).sort((a, b) => b - a); // newest first

    // Build monthly buckets per year
    const byYearMonth = new Map<string, { profile: number; deals: number; eintritte: number; austritte: number }>();
    for (const entry of entries) {
      const d = new Date(entry.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = byYearMonth.get(key) || { profile: 0, deals: 0, eintritte: 0, austritte: 0 };
      existing.profile += entry.profile ?? 0;
      existing.deals += entry.deals ?? 0;
      existing.eintritte += entry.eintritte ?? 0;
      existing.austritte += entry.austritte ?? 0;
      byYearMonth.set(key, existing);
    }

    const data = MONTH_NAMES_SHORT.map((name, monthIdx) => {
      const point: Record<string, string | number | null> = { month: name };
      for (const year of years) {
        const bucket = byYearMonth.get(`${year}-${monthIdx}`);
        point[`profile_${year}`] = bucket ? bucket.profile : null;
        point[`deals_${year}`] = bucket ? bucket.deals : null;
        point[`eintritte_${year}`] = bucket ? bucket.eintritte : null;
        point[`austritte_${year}`] = bucket ? bucket.austritte : null;
      }
      return point;
    });

    return { data, years };
  }, [entries]);

  // ---- Selected year totals + previous year comparison (PER-FIELD month tracking) ----
  const { selectedYearTotals, prevYearMatchingTotals, prevYearLabel, filledMonthCounts } = useMemo(() => {
    const pYear = selectedYear - 1;

    // Track which months have data PER FIELD
    const profileMonths = new Set<number>();
    const dealsMonths = new Set<number>();
    const eintritteMonths = new Set<number>();
    const austritteMonths = new Set<number>();

    const totals = { profile: 0, deals: 0, eintritte: 0, austritte: 0 };
    for (const entry of entries) {
      const d = new Date(entry.date);
      if (d.getFullYear() !== selectedYear) continue;
      const month = d.getMonth();
      if (entry.profile !== null) { profileMonths.add(month); totals.profile += entry.profile; }
      if (entry.deals !== null) { dealsMonths.add(month); totals.deals += entry.deals; }
      if (entry.eintritte !== null) { eintritteMonths.add(month); totals.eintritte += entry.eintritte; }
      if (entry.austritte !== null) { austritteMonths.add(month); totals.austritte += entry.austritte; }
    }

    // Sum ONLY matching months from previous year PER FIELD
    const prevTotals = { profile: 0, deals: 0, eintritte: 0, austritte: 0 };
    for (const entry of entries) {
      const d = new Date(entry.date);
      if (d.getFullYear() !== pYear) continue;
      const month = d.getMonth();
      if (entry.profile !== null && profileMonths.has(month)) prevTotals.profile += entry.profile;
      if (entry.deals !== null && dealsMonths.has(month)) prevTotals.deals += entry.deals;
      if (entry.eintritte !== null && eintritteMonths.has(month)) prevTotals.eintritte += entry.eintritte;
      if (entry.austritte !== null && austritteMonths.has(month)) prevTotals.austritte += entry.austritte;
    }

    const hasAny = profileMonths.size > 0 || dealsMonths.size > 0 || eintritteMonths.size > 0 || austritteMonths.size > 0;

    return {
      selectedYearTotals: totals,
      prevYearMatchingTotals: hasAny ? prevTotals : null,
      prevYearLabel: pYear,
      filledMonthCounts: { profile: profileMonths.size, deals: dealsMonths.size, eintritte: eintritteMonths.size, austritte: austritteMonths.size },
    };
  }, [entries, selectedYear]);

  // ---- Stat cards data ----
  const compareTooltip = prevYearMatchingTotals
    ? `Vergleich mit den gleichen ${filledMonthCounts.profile} erfassten Monaten aus ${prevYearLabel}`
    : "";
  const avgTooltip = allYearsAvg
    ? `Durchschnitt aller abgeschlossenen Jahre (bis ${new Date().getFullYear() - 1}). Trend = aktuelles Jahr auf 12 Monate hochgerechnet.`
    : "";

  const statCards = useMemo(() => {
    const t = selectedYearTotals;
    const pt = prevYearMatchingTotals;
    const avg = allYearsAvg;
    const dealQuote = t.profile > 0 ? (t.deals / t.profile) * 100 : 0;
    const prevDealQuote = pt && pt.profile > 0 ? (pt.deals / pt.profile) * 100 : 0;
    const maWachstum = t.eintritte - t.austritte;
    const prevMaWachstum = pt ? pt.eintritte - pt.austritte : 0;
    const fc = filledMonthCounts;

    function avgPctChangeForField(current: number, avgVal: number | undefined, fieldMonths: number): number | undefined {
      if (!avgVal || avgVal === 0) return current > 0 ? 100 : undefined;
      const projected = fieldMonths > 0 ? (current / fieldMonths) * 12 : 0;
      return Math.round(((projected - avgVal) / avgVal) * 1000) / 10;
    }

    const avgMaWachstum = avg ? avg.maWachstum : 0;
    const maMonths = Math.max(fc.eintritte, fc.austritte);

    return [
      { title: "Profile", value: fmt(t.profile), change: pt ? pctChange(t.profile, pt.profile) : undefined, compareValue: pt ? fmt(pt.profile) : undefined, compareTooltip, avgValue: avg ? fmtDec(avg.profile) : undefined, avgTooltip, avgChange: avg ? avgPctChangeForField(t.profile, avg.profile, fc.profile) : undefined, accent: "from-orange-500 to-orange-600", tint: "bg-orange-100/70" },
      { title: "Deals", value: fmt(t.deals), change: pt ? pctChange(t.deals, pt.deals) : undefined, compareValue: pt ? fmt(pt.deals) : undefined, compareTooltip, avgValue: avg ? fmtDec(avg.deals) : undefined, avgTooltip, avgChange: avg ? avgPctChangeForField(t.deals, avg.deals, fc.deals) : undefined, accent: "from-violet-500 to-violet-600", tint: "bg-violet-100/70" },
      { title: "Deal-Quote", value: fmtPct(dealQuote), change: pt ? pctChange(dealQuote, prevDealQuote) : undefined, compareValue: pt ? fmtPct(prevDealQuote) : undefined, compareTooltip, avgValue: avg ? fmtPct(avg.dealQuote) : undefined, avgTooltip, avgChange: avg ? pctChange(dealQuote, avg.dealQuote) : undefined, accent: "from-purple-500 to-purple-600", tint: "bg-purple-100/70" },
      { title: "Eintritte", value: fmt(t.eintritte), change: pt ? pctChange(t.eintritte, pt.eintritte) : undefined, compareValue: pt ? fmt(pt.eintritte) : undefined, compareTooltip, avgValue: avg ? fmtDec(avg.eintritte) : undefined, avgTooltip, avgChange: avg ? avgPctChangeForField(t.eintritte, avg.eintritte, fc.eintritte) : undefined, accent: "from-emerald-500 to-emerald-600", tint: "bg-emerald-100/70" },
      { title: "Austritte", value: fmt(t.austritte), change: pt ? pctChange(t.austritte, pt.austritte) : undefined, compareValue: pt ? fmt(pt.austritte) : undefined, compareTooltip, avgValue: avg ? fmtDec(avg.austritte) : undefined, avgTooltip, avgChange: avg ? avgPctChangeForField(t.austritte, avg.austritte, fc.austritte) : undefined, accent: "from-red-500 to-red-600", tint: "bg-red-100/70" },
      { title: "MA-Wachstum", value: (maWachstum >= 0 ? "+" : "") + fmt(maWachstum), trend: (maWachstum >= 0 ? "up" : "down") as "up" | "down", compareValue: pt ? ((prevMaWachstum >= 0 ? "+" : "") + fmt(prevMaWachstum)) : undefined, change: pt ? pctChange(maWachstum, prevMaWachstum) : undefined, compareTooltip, avgValue: avg ? ((avgMaWachstum >= 0 ? "+" : "") + fmtDec(avgMaWachstum)) : undefined, avgTooltip, avgChange: avg && avgMaWachstum !== 0 ? Math.round((((maWachstum * (maMonths > 0 ? 12 / maMonths : 0)) - avgMaWachstum) / Math.abs(avgMaWachstum)) * 1000) / 10 : undefined, accent: "from-teal-500 to-teal-600", tint: "bg-teal-100/70" },
    ];
  }, [selectedYearTotals, prevYearMatchingTotals, allYearsAvg, filledMonthCounts, compareTooltip, avgTooltip]);

  // ---- Chart data for selected year (from monthRows) ----
  const selectedYearChartData = useMemo(() => {
    return monthRows.map((row) => ({
      month: MONTH_NAMES_SHORT[row.monthIndex],
      Profile: row.profile,
      Deals: row.deals,
      Eintritte: row.eintritte,
      Austritte: row.austritte,
    }));
  }, [monthRows]);

  // ---- Toggle closed month ----
  const toggleClosedMonth = useCallback(async (year: number, month: number) => {
    if (!id) return;
    const key = `${year}-${month}`;
    // Optimistic update
    setClosedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    await fetch("/api/closed-months", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: id, year, month }),
    });
  }, [id]);

  // ---- Edit mode: all months at once ----
  const [saving, setSaving] = useState(false);

  const enterEditMode = useCallback(() => {
    const data: Record<number, { profile: string; deals: string; eintritte: string; austritte: string }> = {};
    for (let m = 0; m < 12; m++) {
      const row = monthRows.find((r) => r.monthIndex === m);
      data[m] = {
        profile: row?.profile !== null && row?.profile !== undefined ? String(row.profile) : "",
        deals: row?.deals !== null && row?.deals !== undefined ? String(row.deals) : "",
        eintritte: row?.eintritte !== null && row?.eintritte !== undefined ? String(row.eintritte) : "",
        austritte: row?.austritte !== null && row?.austritte !== undefined ? String(row.austritte) : "",
      };
    }
    setEditData(data);
    setIsEditMode(true);
  }, [monthRows]);

  const cancelEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditData({});
  }, []);

  const saveAllMonths = useCallback(async () => {
    if (!employee) return;
    setSaving(true);

    try {
      const batch = Object.entries(editData).map(([monthStr, vals]) => {
        const month = Number(monthStr);
        const profileVal = vals.profile.trim() !== "" ? parseInt(vals.profile) : null;
        const dealsVal = vals.deals.trim() !== "" ? parseInt(vals.deals) : null;
        const eintritteVal = vals.eintritte.trim() !== "" ? parseInt(vals.eintritte) : null;
        const austritteVal = vals.austritte.trim() !== "" ? parseInt(vals.austritte) : null;
        return {
          employeeId: employee.id,
          date: `${selectedYear}-${String(month + 1).padStart(2, "0")}-02T00:00:00.000Z`,
          costCenter: employee.costCenter,
          profile: profileVal,
          vorstellungsgespraeche: null,
          deals: dealsVal,
          eintritte: eintritteVal,
          austritte: austritteVal,
        };
      }).filter((_entry, idx) => {
        const month = Number(Object.keys(editData)[idx]);
        const row = monthRows.find((r) => r.monthIndex === month);
        const hasNewData = _entry.profile !== null || _entry.deals !== null || _entry.eintritte !== null || _entry.austritte !== null;
        const hadExistingData = row && !row.isEmpty;
        return hasNewData || hadExistingData;
      });

      if (batch.length > 0) {
        const res = await fetch("/api/kpi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });
        if (!res.ok) throw new Error("Speichern fehlgeschlagen");
      }

      setIsEditMode(false);
      setEditData({});
      toast.success(`${batch.length} Monate aktualisiert`);
      fetchData();
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }, [employee, editData, selectedYear, monthRows, fetchData, toast]);

  const updateEditField = useCallback((month: number, field: string, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [month]: { ...prev[month], [field]: value },
    }));
  }, []);

  const editInputClass = "w-16 text-right bg-white border border-blue-300 rounded px-1.5 py-0.5 text-xs tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none";

  const selectClass = "bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium shadow-card focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-gray-600";

  // ---- Helper: render year comparison chart ----
  function renderYearCompChart(
    title: string,
    metricKey: string,
    colorPalette: Record<number, string>,
  ) {
    const { data, years } = yearCompChartData;
    if (years.length === 0) return null;

    return (
      <Card title={title}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={35}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* Render oldest first so newest year is drawn on top (highest z-index) */}
              {[...years].reverse().map((year) => {
                const i = years.indexOf(year); // 0 = newest
                return (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`${metricKey}_${year}`}
                    name={String(year)}
                    stroke={colorPalette[Math.min(i, 5)]}
                    strokeWidth={i === 0 ? 2.5 : 1.5}
                    dot={{ r: i === 0 ? 3 : 2 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  if (status === "loading" || (loading && !employee)) {
    return (
      <AppShell pageTitle="Mitarbeiter">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <SkeletonTable rows={6} cols={9} />
          <SkeletonTable rows={3} cols={10} />
        </div>
      </AppShell>
    );
  }

  if (!employee) return null;

  return (
    <AppShell pageTitle={employee.name}>
      <div>
        {/* ── Sticky Header ── */}
        <div className="sticky top-12 md:top-0 z-20 bg-[var(--background)]/95 backdrop-blur-md -mx-4 md:-mx-5 px-4 md:px-5 pt-4 md:pt-5 pb-4 border-b border-gray-200/60 shadow-sm">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/" },
              { label: employee.name },
            ]}
          />

          <div className="flex items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-4">
              {employee.photoUrl ? (
                <img src={employee.photoUrl} alt={employee.name} className="h-10 w-10 rounded-full object-cover shadow-md ring-2 ring-white" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-md">
                  {getInitials(employee.name)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-gray-900">{employee.name}</h1>
                  <Badge color={kstColor(employee.costCenter)}>KST {employee.costCenter}</Badge>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {employee.jobTitle || ""}
                  {employee.jobTitle && employee.startDate && " · "}
                  {employee.startDate && `seit ${new Date(employee.startDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={selectClass}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {isEditMode ? (
                <>
                  <button
                    onClick={cancelEditMode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={saveAllMonths}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Speichert..." : "Speichern"}
                  </button>
                </>
              ) : (
                <button
                  onClick={enterEditMode}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                  </svg>
                  Bearbeiten
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-6">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
            : statCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  change={card.change}
                  compareValue={card.compareValue}
                  compareTooltip={card.compareTooltip}
                  avgValue={card.avgValue}
                  avgTooltip={card.avgTooltip}
                  avgChange={card.avgChange}
                  trend={card.trend}
                  accent={card.accent}
                  tint={card.tint}
                />
              ))}
        </div>

        {/* ── Charts für ausgewähltes Jahr ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Profile & Deals Line Chart */}
          <Card title={`Profile & Deals ${selectedYear}`}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedYearChartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={35} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Profile" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Deals" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Eintritte & Austritte Bar Chart */}
          <Card title={`Eintritte & Austritte ${selectedYear}`}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedYearChartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={35} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Eintritte" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Austritte" fill="#dc2626" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── Monatsübersicht ── */}
        <Card title={`Monatsübersicht ${selectedYear}`} subtitle="Alle Monate für das ausgewählte Jahr">
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col className="w-44" />
                <col className="w-[72px]" />
                <col className="w-[72px]" />
                <col className="w-[84px]" />
                <col className="w-6" />{/* spacer */}
                <col className="w-[72px]" />
                <col className="w-[72px]" />
                <col className="w-[96px]" />
              </colgroup>
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide">
                  <th className="text-left py-2 px-3 rounded-tl-lg bg-gray-200 text-gray-600">Monat</th>
                  <th className="text-right py-2 px-3 bg-orange-100 text-orange-700">Profile</th>
                  <th className="text-right py-2 px-3 bg-violet-100 text-violet-700">Deals</th>
                  <th className="text-right py-2 px-3 bg-purple-100 text-purple-700">Deal-Quote</th>
                  <th className="bg-gray-200 relative"><div className="absolute inset-y-1 left-1/2 w-px bg-gray-300" /></th>
                  <th className="text-right py-2 px-3 bg-emerald-100 text-emerald-700">Eintritte</th>
                  <th className="text-right py-2 px-3 bg-red-100 text-red-700">Austritte</th>
                  <th className="text-right py-2 px-3 rounded-tr-lg bg-teal-100 text-teal-700">MA-Wachstum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthRows.map((row) => {
                  const isClosed = closedMonths.has(`${selectedYear}-${row.monthIndex}`);
                  const ed = editData[row.monthIndex];

                  return (
                  <tr
                    key={row.key}
                    className={`transition-colors ${row.isBeforeStart ? "opacity-20 pointer-events-none" : row.isEmpty && !isEditMode ? "opacity-40" : "hover:bg-gray-50"} `}
                  >
                    {/* Month name + close toggle */}
                    <td className="py-2 px-3 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => !row.isEmpty && !row.isBeforeStart && toggleClosedMonth(selectedYear, row.monthIndex)}
                          className={`flex-shrink-0 h-4 w-4 rounded border transition-colors ${
                            row.isEmpty
                              ? "border-gray-200 cursor-default"
                              : isClosed
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-gray-300 hover:border-gray-400 cursor-pointer"
                          }`}
                          title={row.isEmpty ? "" : isClosed ? "Monat wieder \u00f6ffnen" : "Monat abschlie\u00dfen"}
                          disabled={row.isEmpty}
                        >
                          {isClosed && !row.isEmpty && (
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <span>
                          {MONTH_NAMES_FULL[row.monthIndex]}
                          {row.isCurrent && (
                            <Badge color="yellow" className="ml-1.5">laufend</Badge>
                          )}
                        </span>
                      </div>
                    </td>

                    {isEditMode && ed && !row.isBeforeStart ? (
                      <>
                        <td className="text-right py-1.5 px-2">
                          <input type="number" min={0} value={ed.profile} onChange={(e) => updateEditField(row.monthIndex, "profile", e.target.value)} className={editInputClass} placeholder="" />
                        </td>
                        <td className="text-right py-1.5 px-2">
                          <input type="number" min={0} value={ed.deals} onChange={(e) => updateEditField(row.monthIndex, "deals", e.target.value)} className={editInputClass} placeholder="" />
                        </td>
                        <td className="text-right py-2 px-3 tabular-nums text-gray-400">
                          {(() => {
                            const p = ed.profile.trim() !== "" ? parseInt(ed.profile) : 0;
                            const d = ed.deals.trim() !== "" ? parseInt(ed.deals) : 0;
                            return p > 0 ? fmtPct((d / p) * 100) : "\u2013";
                          })()}
                        </td>
                        <td className="relative"><div className="absolute inset-y-0 left-1/2 w-px bg-gray-100" /></td>
                        <td className="text-right py-1.5 px-2">
                          <input type="number" min={0} value={ed.eintritte} onChange={(e) => updateEditField(row.monthIndex, "eintritte", e.target.value)} className={editInputClass} placeholder="" />
                        </td>
                        <td className="text-right py-1.5 px-2">
                          <input type="number" min={0} value={ed.austritte} onChange={(e) => updateEditField(row.monthIndex, "austritte", e.target.value)} className={editInputClass} placeholder="" />
                        </td>
                        <td className="text-right py-2 px-3 tabular-nums">
                          {(() => {
                            const ein = ed.eintritte.trim() !== "" ? parseInt(ed.eintritte) : null;
                            const aus = ed.austritte.trim() !== "" ? parseInt(ed.austritte) : null;
                            if (ein === null && aus === null) return <span className="text-gray-300">&ndash;</span>;
                            const mw = (ein ?? 0) - (aus ?? 0);
                            return <span className={mw >= 0 ? "text-emerald-600" : "text-red-600"}>{mw >= 0 ? "+" : ""}{fmt(mw)}</span>;
                          })()}
                        </td>
                      </>
                    ) : row.isEmpty ? (
                      <>
                        <td className="text-right py-2 px-3 text-gray-300">&ndash;</td>
                        <td className="text-right py-2 px-3 text-gray-300">&ndash;</td>
                        <td className="text-right py-2 px-3 text-gray-300">&ndash;</td>
                        <td className="relative"><div className="absolute inset-y-0 left-1/2 w-px bg-gray-100" /></td>
                        <td className="text-right py-2 px-3 text-gray-300">&ndash;</td>
                        <td className="text-right py-2 px-3 text-gray-300">&ndash;</td>
                        <td className="text-right py-2 px-3 text-gray-300">&ndash;</td>
                      </>
                    ) : (
                      <>
                        <td className="text-right py-2 px-3 tabular-nums">{row.profile !== null ? fmt(row.profile) : <span className="text-gray-300">&ndash;</span>}</td>
                        <td className="text-right py-2 px-3 tabular-nums">{row.deals !== null ? fmt(row.deals) : <span className="text-gray-300">&ndash;</span>}</td>
                        <td className="text-right py-2 px-3 tabular-nums">{row.dealQuote !== null ? fmtPct(row.dealQuote) : <span className="text-gray-300">&ndash;</span>}</td>
                        <td className="relative"><div className="absolute inset-y-0 left-1/2 w-px bg-gray-100" /></td>
                        <td className="text-right py-2 px-3 tabular-nums">{row.eintritte !== null ? fmt(row.eintritte) : <span className="text-gray-300">&ndash;</span>}</td>
                        <td className="text-right py-2 px-3 tabular-nums">{row.austritte !== null ? fmt(row.austritte) : <span className="text-gray-300">&ndash;</span>}</td>
                        <td className="text-right py-2 px-3 tabular-nums">
                          {row.maWachstum !== null ? (
                            <span className={row.maWachstum >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                              {row.maWachstum >= 0 ? "+" : ""}{fmt(row.maWachstum)}
                            </span>
                          ) : <span className="text-gray-300">&ndash;</span>}
                        </td>
                      </>
                    )}
                  </tr>
                  );
                })}
                {/* ── Summary section ── */}
                {(yearAvg || yearTotal) && (
                  <tr><td colSpan={8} className="py-1"><div className="border-t-2 border-gray-300" /></td></tr>
                )}
                {yearAvg && (
                  <tr className="bg-slate-100/80 font-semibold text-gray-600">
                    <td className="py-2.5 px-3 text-gray-500 text-xs">&#216; Monatlich</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{yearAvg.profile !== null ? fmtDec(yearAvg.profile) : <span className="text-gray-300">&ndash;</span>}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{yearAvg.deals !== null ? fmtDec(yearAvg.deals) : <span className="text-gray-300">&ndash;</span>}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{yearAvg.dealQuote !== null ? fmtPct(yearAvg.dealQuote) : <span className="text-gray-300">&ndash;</span>}</td>
                    <td className="relative"><div className="absolute inset-y-0 left-1/2 w-px bg-gray-100" /></td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{yearAvg.eintritte !== null ? fmtDec(yearAvg.eintritte) : <span className="text-gray-300">&ndash;</span>}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{yearAvg.austritte !== null ? fmtDec(yearAvg.austritte) : <span className="text-gray-300">&ndash;</span>}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">
                      {yearAvg.maWachstum !== null ? (
                        <span className={yearAvg.maWachstum >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {yearAvg.maWachstum >= 0 ? "+" : ""}{fmtDec(yearAvg.maWachstum)}
                        </span>
                      ) : <span className="text-gray-300">&ndash;</span>}
                    </td>
                  </tr>
                )}
                {yearTotal && (
                  <tr className="bg-slate-200/70 font-bold text-gray-800">
                    <td className="py-2.5 px-3 text-xs">Gesamt {selectedYear}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmt(yearTotal.profile)}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmt(yearTotal.deals)}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums text-gray-300">&ndash;</td>
                    <td className="relative"><div className="absolute inset-y-0 left-1/2 w-px bg-gray-100" /></td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmt(yearTotal.eintritte)}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmt(yearTotal.austritte)}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">
                      <span className={yearTotal.maWachstum >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {yearTotal.maWachstum >= 0 ? "+" : ""}{fmt(yearTotal.maWachstum)}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Jahresübersicht ── */}
        <Card>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-800">Jahresübersicht</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Aggregiert pro Jahr</p>
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col className="w-44" />
                <col className="w-[72px]" />
                <col className="w-[72px]" />
                <col className="w-[84px]" />
                <col className="w-6" />{/* spacer */}
                <col className="w-[72px]" />
                <col className="w-[72px]" />
                <col className="w-[96px]" />
              </colgroup>
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide">
                  <th className="text-left py-2 px-3 rounded-tl-lg bg-gray-200 text-gray-600">Jahr</th>
                  <th className="text-right py-2 px-3 bg-orange-100 text-orange-700">Profile</th>
                  <th className="text-right py-2 px-3 bg-violet-100 text-violet-700">Deals</th>
                  <th className="text-right py-2 px-3 bg-purple-100 text-purple-700">Deal-Quote</th>
                  <th className="bg-gray-200 relative"><div className="absolute inset-y-1 left-1/2 w-px bg-gray-300" /></th>
                  <th className="text-right py-2 px-3 bg-emerald-100 text-emerald-700">Eintritte</th>
                  <th className="text-right py-2 px-3 bg-red-100 text-red-700">Austritte</th>
                  <th className="text-right py-2 px-3 rounded-tr-lg bg-teal-100 text-teal-700">MA-Wachstum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yearRows.map((row) => (
                  <tr key={row.year} className={`transition-colors hover:bg-gray-50 `}>
                    <td className="py-2 px-3 font-medium text-gray-900 whitespace-nowrap">
                      {row.year}
                      {row.isCurrent && (
                        <Badge color="yellow" className="ml-1.5">laufend</Badge>
                      )}
                    </td>
                    <td className="text-right py-2 px-3 tabular-nums">{fmt(row.profile)}</td>
                    <td className="text-right py-2 px-3 tabular-nums">{fmt(row.deals)}</td>
                    <td className="text-right py-2 px-3 tabular-nums">{fmtPct(row.dealQuote)}</td>
                    <td className="relative"><div className="absolute inset-y-0 left-1/2 w-px bg-gray-100" /></td>
                    <td className="text-right py-2 px-3 tabular-nums">{fmt(row.eintritte)}</td>
                    <td className="text-right py-2 px-3 tabular-nums">{fmt(row.austritte)}</td>
                    <td className="text-right py-2 px-3 tabular-nums">
                      <span className={row.maWachstum >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                        {row.maWachstum >= 0 ? "+" : ""}{fmt(row.maWachstum)}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* ── Summary section ── */}
                {allYearsAvg && (
                  <tr><td colSpan={8} className="py-1"><div className="border-t-2 border-gray-300" /></td></tr>
                )}
                {allYearsAvg && (
                  <tr className="bg-slate-100/80 font-semibold text-gray-600">
                    <td className="py-2.5 px-3 text-gray-500 text-xs">&#216; Jährlich bis {new Date().getFullYear() - 1}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmtDec(allYearsAvg.profile)}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmtDec(allYearsAvg.deals)}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmtPct(allYearsAvg.dealQuote)}</td>
                    <td className="relative"><div className="absolute inset-y-0 left-1/2 w-px bg-gray-100" /></td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmtDec(allYearsAvg.eintritte)}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">{fmtDec(allYearsAvg.austritte)}</td>
                    <td className="text-right py-2.5 px-3 tabular-nums">
                      <span className={allYearsAvg.maWachstum >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {allYearsAvg.maWachstum >= 0 ? "+" : ""}{fmtDec(allYearsAvg.maWachstum)}
                      </span>
                    </td>
                  </tr>
                )}
                {/* vs. Vorjahr row */}
                {allYearsAvg && yearRows.length > 0 && yearRows[0].isCurrent && (() => {
                  const curr = yearRows[0];
                  const now = new Date();
                  const monthsElapsed = now.getMonth() + 1;
                  const proj = (v: number) => (v / monthsElapsed) * 12;
                  const pct = (curr: number, avg: number) => avg > 0 ? Math.round(((proj(curr) - avg) / avg) * 1000) / 10 : null;
                  const pctBadge = (val: number | null) => {
                    if (val === null) return <span className="text-gray-300">&ndash;</span>;
                    return (
                      <span className={`${val >= 0 ? "text-emerald-600" : "text-red-600"} font-semibold`}>
                        {val >= 0 ? "+" : ""}{fmtDec(val)}%
                      </span>
                    );
                  };

                  return (
                    <tr className="bg-slate-200/50">
                      <td className="py-2.5 px-3 text-gray-600 text-xs font-medium">Trend vs. &#216;<br /><span className="text-[10px] text-gray-400 font-normal">{selectedYear} auf 12 Mon. hochgerechnet</span></td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-xs">{pctBadge(pct(curr.profile, allYearsAvg.profile))}</td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-xs">{pctBadge(pct(curr.deals, allYearsAvg.deals))}</td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-xs">{pctBadge(allYearsAvg.dealQuote > 0 ? Math.round(((curr.dealQuote - allYearsAvg.dealQuote) / allYearsAvg.dealQuote) * 1000) / 10 : null)}</td>
                      <td className="relative"><div className="absolute inset-y-0 left-1/2 w-px bg-gray-100" /></td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-xs">{pctBadge(pct(curr.eintritte, allYearsAvg.eintritte))}</td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-xs">{pctBadge(pct(curr.austritte, allYearsAvg.austritte))}</td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-xs">{pctBadge(allYearsAvg.maWachstum !== 0 ? Math.round(((proj(curr.maWachstum) - allYearsAvg.maWachstum) / Math.abs(allYearsAvg.maWachstum)) * 1000) / 10 : null)}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
            {yearRows.length === 0 && !loading && (
              <p className="text-center text-xs text-gray-400 py-8">Keine Einträge vorhanden.</p>
            )}
          </div>
        </Card>

        {/* ── Jahresvergleich Charts (2x2 Grid) ── */}
        {yearCompChartData.years.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderYearCompChart("Jahresvergleich: Profile", "profile", PROFILE_COLORS)}
            {renderYearCompChart("Jahresvergleich: Deals", "deals", DEALS_COLORS)}
            {renderYearCompChart("Jahresvergleich: Eintritte", "eintritte", EINTRITTE_COLORS)}
            {renderYearCompChart("Jahresvergleich: Austritte", "austritte", AUSTRITTE_COLORS)}
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}
