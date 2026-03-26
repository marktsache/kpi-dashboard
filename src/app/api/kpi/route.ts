import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { kpiEntrySchema, kpiEntryArraySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

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
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || "unknown";
  const body = await request.json();

  const isBatch = Array.isArray(body);
  const parseResult = isBatch
    ? kpiEntryArraySchema.safeParse(body)
    : kpiEntrySchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const nullableInt = (val: unknown): number | null =>
    val === null || val === undefined ? null : Number(val);

  const upsertEntry = (entry: Record<string, unknown>) =>
    prisma.kpiEntry.upsert({
      where: {
        employeeId_date: {
          employeeId: entry.employeeId as string,
          date: new Date(entry.date as string),
        },
      },
      update: {
        costCenter: entry.costCenter as string,
        comment: (entry.comment as string) || null,
        profile: nullableInt(entry.profile),
        vorstellungsgespraeche: nullableInt(entry.vorstellungsgespraeche),
        deals: nullableInt(entry.deals),
        eintritte: nullableInt(entry.eintritte),
        austritte: nullableInt(entry.austritte),
      },
      create: {
        employeeId: entry.employeeId as string,
        date: new Date(entry.date as string),
        periodType: "month",
        costCenter: entry.costCenter as string,
        comment: (entry.comment as string) || null,
        profile: nullableInt(entry.profile),
        vorstellungsgespraeche: nullableInt(entry.vorstellungsgespraeche),
        deals: nullableInt(entry.deals),
        eintritte: nullableInt(entry.eintritte),
        austritte: nullableInt(entry.austritte),
      },
    });

  if (isBatch) {
    const entries = await prisma.$transaction((body as Record<string, unknown>[]).map(upsertEntry));
    for (const entry of entries) {
      logAudit({ userId, action: "create", entityType: "KpiEntry", entityId: entry.id, changes: entry as unknown as Record<string, unknown> });
    }
    return NextResponse.json(entries, { status: 201 });
  }

  const entry = await upsertEntry(body);
  logAudit({ userId, action: "create", entityType: "KpiEntry", entityId: entry.id, changes: entry as unknown as Record<string, unknown> });
  return NextResponse.json(entry, { status: 201 });
}
