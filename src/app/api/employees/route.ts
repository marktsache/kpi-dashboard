import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const costCenter = searchParams.get("costCenter");
  const active = searchParams.get("active");

  const where: Record<string, unknown> = {};
  if (costCenter && costCenter !== "all") where.costCenter = costCenter;
  if (active !== null) where.active = active === "true";

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { kpiEntries: true } } },
  });

  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, costCenter } = body;

  if (!name || !costCenter) {
    return NextResponse.json({ error: "Name und Kostenstelle sind erforderlich" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: { name, email: email || null, costCenter },
  });

  return NextResponse.json(employee, { status: 201 });
}
