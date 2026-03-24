import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const costCenter = searchParams.get("costCenter");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (costCenter && costCenter !== "all") where.costCenter = costCenter;
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const entries = await prisma.kpiEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: { employee: { select: { name: true, costCenter: true } } },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (Array.isArray(body)) {
    const entries = await prisma.$transaction(
      body.map((entry: Record<string, unknown>) =>
        prisma.kpiEntry.upsert({
          where: {
            employeeId_date: {
              employeeId: entry.employeeId as string,
              date: new Date(entry.date as string),
            },
          },
          update: {
            costCenter: entry.costCenter as string,
            kundenbesuche: (entry.kundenbesuche as number) || 0,
            telefonate: (entry.telefonate as number) || 0,
            auftraegeAkquiriert: (entry.auftraegeAkquiriert as number) || 0,
            auftraegeAbgeschlossen: (entry.auftraegeAbgeschlossen as number) || 0,
            profileVerschickt: (entry.profileVerschickt as number) || 0,
            vorstellungsgespraeche: (entry.vorstellungsgespraeche as number) || 0,
            externeEinstellungen: (entry.externeEinstellungen as number) || 0,
            eintritte: (entry.eintritte as number) || 0,
            austritte: (entry.austritte as number) || 0,
          },
          create: {
            employeeId: entry.employeeId as string,
            date: new Date(entry.date as string),
            costCenter: entry.costCenter as string,
            kundenbesuche: (entry.kundenbesuche as number) || 0,
            telefonate: (entry.telefonate as number) || 0,
            auftraegeAkquiriert: (entry.auftraegeAkquiriert as number) || 0,
            auftraegeAbgeschlossen: (entry.auftraegeAbgeschlossen as number) || 0,
            profileVerschickt: (entry.profileVerschickt as number) || 0,
            vorstellungsgespraeche: (entry.vorstellungsgespraeche as number) || 0,
            externeEinstellungen: (entry.externeEinstellungen as number) || 0,
            eintritte: (entry.eintritte as number) || 0,
            austritte: (entry.austritte as number) || 0,
          },
        })
      )
    );
    return NextResponse.json(entries, { status: 201 });
  }

  const entry = await prisma.kpiEntry.upsert({
    where: {
      employeeId_date: {
        employeeId: body.employeeId,
        date: new Date(body.date),
      },
    },
    update: {
      costCenter: body.costCenter,
      kundenbesuche: body.kundenbesuche || 0,
      telefonate: body.telefonate || 0,
      auftraegeAkquiriert: body.auftraegeAkquiriert || 0,
      auftraegeAbgeschlossen: body.auftraegeAbgeschlossen || 0,
      profileVerschickt: body.profileVerschickt || 0,
      vorstellungsgespraeche: body.vorstellungsgespraeche || 0,
      externeEinstellungen: body.externeEinstellungen || 0,
      eintritte: body.eintritte || 0,
      austritte: body.austritte || 0,
    },
    create: {
      employeeId: body.employeeId,
      date: new Date(body.date),
      costCenter: body.costCenter,
      kundenbesuche: body.kundenbesuche || 0,
      telefonate: body.telefonate || 0,
      auftraegeAkquiriert: body.auftraegeAkquiriert || 0,
      auftraegeAbgeschlossen: body.auftraegeAbgeschlossen || 0,
      profileVerschickt: body.profileVerschickt || 0,
      vorstellungsgespraeche: body.vorstellungsgespraeche || 0,
      externeEinstellungen: body.externeEinstellungen || 0,
      eintritte: body.eintritte || 0,
      austritte: body.austritte || 0,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
