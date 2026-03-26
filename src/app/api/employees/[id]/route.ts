import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { employeeUpdateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

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
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || "unknown";
  const body = await request.json();

  const parseResult = employeeUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { name, costCenter, active, photoUrl, jobTitle, startDate } = parseResult.data;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(costCenter !== undefined && { costCenter }),
      ...(active !== undefined && { active }),
      ...(photoUrl !== undefined && { photoUrl }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
    },
  });

  logAudit({ userId, action: "update", entityType: "Employee", entityId: id, changes: parseResult.data });

  return NextResponse.json(employee);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || "unknown";

  logAudit({ userId, action: "delete", entityType: "Employee", entityId: id, changes: {} });

  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
