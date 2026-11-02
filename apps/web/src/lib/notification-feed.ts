import { db } from "@supportops/database";

export async function listNotifications(
  organizationId: string,
  userId: string,
  cursor?: string,
) {
  const recipientWhere = {
    organizationId,
    recipient: { is: { userId } },
  };
  const scopedCursor = cursor
    ? await db.notification.findFirst({
        where: { id: cursor, ...recipientWhere },
        select: { id: true },
      })
    : null;
  const items = await db.notification.findMany({
    where: recipientWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    ...(scopedCursor ? { cursor: { id: scopedCursor.id }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      summary: true,
      createdAt: true,
      readAt: true,
      ticket: { select: { id: true, subject: true } },
    },
  });
  const hasMore = items.length > 50;
  const page = items.slice(0, 50);
  return {
    items: page,
    unreadCount: await db.notification.count({
      where: {
        organizationId,
        readAt: null,
        recipient: { is: { userId } },
      },
    }),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function markNotificationRead(
  organizationId: string,
  userId: string,
  notificationId: string,
) {
  return db.notification.updateMany({
    where: {
      id: notificationId,
      organizationId,
      recipient: { is: { userId } },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
