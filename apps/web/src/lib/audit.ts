import type { Prisma } from "@prisma/client";
import { db } from "@supportops/database";

export interface AuditEventInput {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

export async function writeAuditEvent(
  transaction: Prisma.TransactionClient,
  input: AuditEventInput,
) {
  return transaction.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    },
    select: { id: true },
  });
}

export async function listAuditEvents(organizationId: string, cursor?: string) {
  const scopedCursor = cursor
    ? await db.auditEvent.findFirst({
        where: { id: cursor, organizationId },
        select: { id: true },
      })
    : null;
  const events = await db.auditEvent.findMany({
    where: { organizationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    ...(scopedCursor ? { cursor: { id: scopedCursor.id }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      summary: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });
  const hasMore = events.length > 50;
  const items = events.slice(0, 50);
  return {
    items,
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
  };
}
