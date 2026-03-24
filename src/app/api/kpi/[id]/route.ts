import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || "unknown";

  const entry = await prisma.kpiEntry.findUnique({ where: { id } });
  if (entry) {
    logAudit({ userId, action: "delete", entityType: "KpiEntry", entityId: id, changes: entry as unknown as Record<string, unknown> });
  }

  await prisma.kpiEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
