import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/closed-months?employeeId=xxx
export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  const closed = await prisma.closedMonth.findMany({
    where: { employeeId },
    select: { year: true, month: true },
  });

  return NextResponse.json(closed);
}

// POST /api/closed-months  { employeeId, year, month }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employeeId, year, month } = body;

  if (!employeeId || year === undefined || month === undefined) {
    return NextResponse.json({ error: "employeeId, year, month required" }, { status: 400 });
  }

  const existing = await prisma.closedMonth.findUnique({
    where: { employeeId_year_month: { employeeId, year, month } },
  });

  if (existing) {
    // Toggle: if already closed, reopen
    await prisma.closedMonth.delete({ where: { id: existing.id } });
    return NextResponse.json({ closed: false });
  } else {
    await prisma.closedMonth.create({
      data: { employeeId, year, month },
    });
    return NextResponse.json({ closed: true });
  }
}
