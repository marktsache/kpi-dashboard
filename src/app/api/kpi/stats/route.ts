import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Get ISO week number (1-53) for a Date. */
function getISOWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const costCenter = searchParams.get("costCenter");
  const viewMode = searchParams.get("viewMode") || searchParams.get("periodType") || "week";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const employeeId = searchParams.get("employeeId");

  // Always load ALL weekly entries (no periodType filter)
  const where: Record<string, unknown> = {};
  if (costCenter && costCenter !== "all") where.costCenter = costCenter;
  if (employeeId) where.employeeId = employeeId;
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const entries = await prisma.kpiEntry.findMany({
    where,
    orderBy: { date: "asc" },
    include: { employee: { select: { name: true } } },
  });

  const zero = {
    profile: 0, vorstellungsgespraeche: 0, deals: 0,
    eintritte: 0, austritte: 0,
  };

  type ZeroType = typeof zero;

  const addEntry = (acc: ZeroType, e: { profile: number | null; vorstellungsgespraeche: number | null; deals: number | null; eintritte: number | null; austritte: number | null }) => ({
    profile: acc.profile + (e.profile ?? 0),
    vorstellungsgespraeche: acc.vorstellungsgespraeche + (e.vorstellungsgespraeche ?? 0),
    deals: acc.deals + (e.deals ?? 0),
    eintritte: acc.eintritte + (e.eintritte ?? 0),
    austritte: acc.austritte + (e.austritte ?? 0),
  });

  const totals = entries.reduce((acc, e) => addEntry(acc, e), { ...zero });

  const dealQuote = totals.profile > 0
    ? Math.round((totals.deals / totals.profile) * 1000) / 10 : 0;
  const maWachstum = totals.eintritte - totals.austritte;

  // ---------------------------------------------------------------------------
  // Trends: grouped by month or by KW depending on viewMode
  // ---------------------------------------------------------------------------
  const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  let trends: Array<Record<string, string | number | string[]>>;

  if (viewMode === "month") {
    // Group weekly entries by calendar month
    const monthBuckets: ZeroType[] = Array.from({ length: 12 }, () => ({ ...zero }));
    const monthComments: string[][] = Array.from({ length: 12 }, () => []);
    for (const entry of entries) {
      const m = new Date(entry.date).getMonth(); // 0-11
      monthBuckets[m] = addEntry(monthBuckets[m], entry);
      if (entry.comment) {
        monthComments[m].push(`${entry.employee.name}: ${entry.comment}`);
      }
    }
    trends = monthBuckets.map((data, i) => ({ label: monthNames[i], ...data, _comments: monthComments[i] }));
  } else {
    // 52 KW buckets
    const weekBuckets: ZeroType[] = Array.from({ length: 52 }, () => ({ ...zero }));
    const weekComments: string[][] = Array.from({ length: 52 }, () => []);
    for (const entry of entries) {
      const kw = getISOWeek(new Date(entry.date));
      const idx = Math.min(kw - 1, 51);
      weekBuckets[idx] = addEntry(weekBuckets[idx], entry);
      if (entry.comment) {
        weekComments[idx].push(`${entry.employee.name}: ${entry.comment}`);
      }
    }
    trends = weekBuckets.map((data, i) => ({ label: `KW ${i + 1}`, ...data, _comments: weekComments[i] }));
  }

  // By cost center
  const byCostCenter = new Map<string, ZeroType>();
  for (const entry of entries) {
    const existing = byCostCenter.get(entry.costCenter) || { ...zero };
    byCostCenter.set(entry.costCenter, addEntry(existing, entry));
  }
  const costCenterBreakdown = Array.from(byCostCenter.entries()).map(([cc, data]) => ({
    costCenter: cc, ...data,
  }));

  // Year comparison: monthly data grouped by year+month (from weekly entries)
  const yearCompare = new Map<string, Map<number, ZeroType>>();
  for (const entry of entries) {
    const d = new Date(entry.date);
    const year = String(d.getFullYear());
    const month = d.getMonth();
    if (!yearCompare.has(year)) yearCompare.set(year, new Map());
    const yearMap = yearCompare.get(year)!;
    const existing = yearMap.get(month) || { ...zero };
    yearMap.set(month, addEntry(existing, entry));
  }

  const years = Array.from(yearCompare.keys()).sort();
  const yearComparison = monthNames.map((name, idx) => {
    const row: Record<string, unknown> = { month: name };
    for (const year of years) {
      const data = yearCompare.get(year)?.get(idx);
      row[`eintritte_${year}`] = data?.eintritte || 0;
      row[`austritte_${year}`] = data?.austritte || 0;
      row[`profile_${year}`] = data?.profile || 0;
      row[`vorstellungsgespraeche_${year}`] = data?.vorstellungsgespraeche || 0;
      row[`deals_${year}`] = data?.deals || 0;
    }
    return row;
  });

  // ---------------------------------------------------------------------------
  // Previous period comparison
  // ---------------------------------------------------------------------------
  let previousTotals: ZeroType | null = null;
  let previousComputed: Record<string, number> | null = null;

  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const duration = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - duration - 86400000);
    const prevTo = new Date(fromDate.getTime() - 86400000);

    const prevEntries = await prisma.kpiEntry.findMany({
      where: {
        ...((costCenter && costCenter !== "all") ? { costCenter } : {}),
        ...(employeeId ? { employeeId } : {}),
        date: { gte: prevFrom, lte: prevTo },
      },
      orderBy: { date: "asc" },
    });

    previousTotals = prevEntries.reduce((acc, e) => addEntry(acc, e), { ...zero });
    const prevDealQuote = previousTotals.profile > 0
      ? Math.round((previousTotals.deals / previousTotals.profile) * 1000) / 10 : 0;
    const prevMaWachstum = previousTotals.eintritte - previousTotals.austritte;

    previousComputed = {
      dealQuote: prevDealQuote,
      maWachstum: prevMaWachstum,
    };
  }

  return NextResponse.json({
    totals,
    computed: { dealQuote, maWachstum },
    trends,
    costCenterBreakdown,
    yearComparison,
    years,
    entryCount: entries.length,
    previousTotals,
    previousComputed,
  });
}
