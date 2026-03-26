import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { employeeCreateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

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
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || "unknown";
  const body = await request.json();

  const parseResult = employeeCreateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { name, costCenter, jobTitle, startDate } = parseResult.data;

  const employee = await prisma.employee.create({
    data: {
      name,
      costCenter,
      ...(jobTitle && { jobTitle }),
      ...(startDate && { startDate: new Date(startDate) }),
    },
  });

  logAudit({ userId, action: "create", entityType: "Employee", entityId: employee.id, changes: { name, costCenter, jobTitle, startDate } });

  return NextResponse.json(employee, { status: 201 });
}
