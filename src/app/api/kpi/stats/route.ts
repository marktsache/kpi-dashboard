import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const costCenter = searchParams.get("costCenter");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (costCenter && costCenter !== "all") where.costCenter = costCenter;
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const entries = await prisma.kpiEntry.findMany({ where });

  const totals = entries.reduce(
    (acc, entry) => ({
      kundenbesuche: acc.kundenbesuche + entry.kundenbesuche,
      telefonate: acc.telefonate + entry.telefonate,
      auftraegeAkquiriert: acc.auftraegeAkquiriert + entry.auftraegeAkquiriert,
      auftraegeAbgeschlossen: acc.auftraegeAbgeschlossen + entry.auftraegeAbgeschlossen,
      profileVerschickt: acc.profileVerschickt + entry.profileVerschickt,
      vorstellungsgespraeche: acc.vorstellungsgespraeche + entry.vorstellungsgespraeche,
      externeEinstellungen: acc.externeEinstellungen + entry.externeEinstellungen,
      eintritte: acc.eintritte + entry.eintritte,
      austritte: acc.austritte + entry.austritte,
    }),
    {
      kundenbesuche: 0,
      telefonate: 0,
      auftraegeAkquiriert: 0,
      auftraegeAbgeschlossen: 0,
      profileVerschickt: 0,
      vorstellungsgespraeche: 0,
      externeEinstellungen: 0,
      eintritte: 0,
      austritte: 0,
    }
  );

  const kontakte = totals.kundenbesuche + totals.telefonate;
  const hitRate =
    totals.auftraegeAkquiriert > 0
      ? Math.round((totals.auftraegeAbgeschlossen / totals.auftraegeAkquiriert) * 100)
      : 0;
  const conversionRate =
    kontakte > 0
      ? Math.round((totals.auftraegeAbgeschlossen / kontakte) * 100)
      : 0;
  const besetzungsquote =
    totals.profileVerschickt > 0
      ? Math.round((totals.externeEinstellungen / totals.profileVerschickt) * 100)
      : 0;
  const nettoVeraenderung = totals.eintritte - totals.austritte;
  const fluktuationsrate =
    totals.eintritte > 0
      ? Math.round((totals.austritte / totals.eintritte) * 100)
      : 0;
  const profileProBesetzung =
    totals.externeEinstellungen > 0
      ? Math.round((totals.profileVerschickt / totals.externeEinstellungen) * 10) / 10
      : 0;

  // Trend data grouped by date
  const trendMap = new Map<string, typeof totals>();
  for (const entry of entries) {
    const dateKey = new Date(entry.date).toISOString().split("T")[0];
    const existing = trendMap.get(dateKey) || {
      kundenbesuche: 0, telefonate: 0, auftraegeAkquiriert: 0,
      auftraegeAbgeschlossen: 0, profileVerschickt: 0,
      vorstellungsgespraeche: 0, externeEinstellungen: 0,
      eintritte: 0, austritte: 0,
    };
    trendMap.set(dateKey, {
      kundenbesuche: existing.kundenbesuche + entry.kundenbesuche,
      telefonate: existing.telefonate + entry.telefonate,
      auftraegeAkquiriert: existing.auftraegeAkquiriert + entry.auftraegeAkquiriert,
      auftraegeAbgeschlossen: existing.auftraegeAbgeschlossen + entry.auftraegeAbgeschlossen,
      profileVerschickt: existing.profileVerschickt + entry.profileVerschickt,
      vorstellungsgespraeche: existing.vorstellungsgespraeche + entry.vorstellungsgespraeche,
      externeEinstellungen: existing.externeEinstellungen + entry.externeEinstellungen,
      eintritte: existing.eintritte + entry.eintritte,
      austritte: existing.austritte + entry.austritte,
    });
  }

  const trends = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  // Per cost center breakdown
  const byCostCenter = new Map<string, typeof totals>();
  for (const entry of entries) {
    const existing = byCostCenter.get(entry.costCenter) || {
      kundenbesuche: 0, telefonate: 0, auftraegeAkquiriert: 0,
      auftraegeAbgeschlossen: 0, profileVerschickt: 0,
      vorstellungsgespraeche: 0, externeEinstellungen: 0,
      eintritte: 0, austritte: 0,
    };
    byCostCenter.set(entry.costCenter, {
      kundenbesuche: existing.kundenbesuche + entry.kundenbesuche,
      telefonate: existing.telefonate + entry.telefonate,
      auftraegeAkquiriert: existing.auftraegeAkquiriert + entry.auftraegeAkquiriert,
      auftraegeAbgeschlossen: existing.auftraegeAbgeschlossen + entry.auftraegeAbgeschlossen,
      profileVerschickt: existing.profileVerschickt + entry.profileVerschickt,
      vorstellungsgespraeche: existing.vorstellungsgespraeche + entry.vorstellungsgespraeche,
      externeEinstellungen: existing.externeEinstellungen + entry.externeEinstellungen,
      eintritte: existing.eintritte + entry.eintritte,
      austritte: existing.austritte + entry.austritte,
    });
  }

  const costCenterBreakdown = Array.from(byCostCenter.entries()).map(([cc, data]) => ({
    costCenter: cc,
    ...data,
  }));

  return NextResponse.json({
    totals,
    computed: {
      kontakte,
      hitRate,
      conversionRate,
      besetzungsquote,
      nettoVeraenderung,
      fluktuationsrate,
      profileProBesetzung,
    },
    trends,
    costCenterBreakdown,
    entryCount: entries.length,
  });
}
