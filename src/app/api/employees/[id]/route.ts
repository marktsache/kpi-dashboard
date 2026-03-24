import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      kpiEntries: { orderBy: { date: "desc" } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(employee);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, email, costCenter, active } = body;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(costCenter !== undefined && { costCenter }),
      ...(active !== undefined && { active }),
    },
  });

  return NextResponse.json(employee);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
