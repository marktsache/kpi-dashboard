import { prisma } from "@/lib/db";

interface AuditParams {
  userId: string;
  action: "create" | "update" | "delete";
  entityType: "KpiEntry" | "Employee";
  entityId: string;
  changes: Record<string, unknown>;
}

export function logAudit({ userId, action, entityType, entityId, changes }: AuditParams) {
  prisma.auditLog
    .create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: JSON.stringify(changes),
      },
    })
    .catch(console.error);
}
