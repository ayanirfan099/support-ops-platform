import type { Prisma } from "@prisma/client";
import {
  canTransitionTicket,
  calculateSlaState,
  type TicketListFilters,
} from "@supportops/contracts";
import { db } from "@supportops/database";
export { toCustomerTicketView } from "./customer-ticket-view";

export class TicketNotFoundError extends Error {
  constructor() {
    super("Ticket not found");
    this.name = "TicketNotFoundError";
  }
}

export class TicketConflictError extends Error {
  constructor() {
    super("Ticket changed since it was loaded. Refresh and try again.");
    this.name = "TicketConflictError";
  }
}

export class TicketTransitionError extends Error {
  constructor() {
    super("That ticket change is not allowed.");
    this.name = "TicketTransitionError";
  }
}

export async function listTickets(filters: TicketListFilters) {
  const where: Prisma.TicketWhereInput = {
    organizationId: filters.organizationId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.assigneeMembershipId
      ? {
          assignments: {
            some: {
              membershipId: filters.assigneeMembershipId,
              endedAt: null,
            },
          },
        }
      : {}),
    ...(filters.tag
      ? {
          tags: {
            some: {
              tag: { is: { name: filters.tag.toLowerCase() } },
            },
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { subject: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
            {
              customer: {
                is: { name: { contains: filters.query, mode: "insensitive" } },
              },
            },
            {
              customer: {
                is: { email: { contains: filters.query, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };

  const [total, tickets] = await db.$transaction([
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignments: {
          where: { endedAt: null },
          take: 1,
          include: {
            membership: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  return {
    items: tickets.map((ticket) => ({
      ...ticket,
      assignee: ticket.assignments[0]?.membership.user ?? null,
      tags: ticket.tags.map(({ tag }) => tag),
      slaState: calculateSlaState(
        ticket.slaTargetAt,
        new Date(),
        ticket.resolvedAt,
      ),
    })),
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages: Math.ceil(total / filters.pageSize),
  };
}

export async function getTicket(organizationId: string, ticketId: string) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, organizationId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
      internalNotes: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          membership: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      tags: { include: { tag: { select: { id: true, name: true } } } },
      activities: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true } } },
      },
      triageSuggestions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  if (!ticket) throw new TicketNotFoundError();
  return {
    ...ticket,
    assignee:
      ticket.assignments.find(({ endedAt }) => endedAt === null)?.membership
        .user ?? null,
    tags: ticket.tags.map(({ tag }) => tag),
    slaState: calculateSlaState(
      ticket.slaTargetAt,
      new Date(),
      ticket.resolvedAt,
    ),
  };
}

export async function createTicket(
  input: {
    organizationId: string;
    subject: string;
    description: string;
    priority: "low" | "normal" | "high" | "urgent";
    slaTargetAt?: string;
    customer: { name: string; email: string };
  },
  actorUserId: string,
) {
  return db.$transaction(async (transaction) => {
    const customer = await transaction.customer.upsert({
      where: {
        organizationId_email: {
          organizationId: input.organizationId,
          email: input.customer.email,
        },
      },
      update: { name: input.customer.name },
      create: {
        organizationId: input.organizationId,
        name: input.customer.name,
        email: input.customer.email,
      },
      select: { id: true },
    });

    const ticket = await transaction.ticket.create({
      data: {
        organizationId: input.organizationId,
        customerId: customer.id,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        slaTargetAt: input.slaTargetAt ? new Date(input.slaTargetAt) : null,
      },
    });

    await transaction.ticketActivity.create({
      data: {
        organizationId: input.organizationId,
        ticketId: ticket.id,
        actorUserId,
        type: "created",
        summary: "Ticket created",
      },
    });
    return ticket;
  });
}

export async function transitionTicket(
  organizationId: string,
  ticketId: string,
  actorUserId: string,
  nextStatus: "new" | "open" | "pending" | "resolved" | "closed",
  expectedVersion: number,
) {
  return db.$transaction(async (transaction) => {
    const current = await transaction.ticket.findFirst({
      where: { id: ticketId, organizationId },
      select: { status: true, version: true, resolvedAt: true },
    });
    if (!current) throw new TicketNotFoundError();
    if (current.version !== expectedVersion) throw new TicketConflictError();
    if (!canTransitionTicket(current.status, nextStatus)) {
      throw new TicketTransitionError();
    }

    const result = await transaction.ticket.updateMany({
      where: { id: ticketId, organizationId, version: expectedVersion },
      data: {
        status: nextStatus,
        version: { increment: 1 },
        resolvedAt:
          nextStatus === "resolved"
            ? new Date()
            : nextStatus === "closed"
              ? (current.resolvedAt ?? new Date())
              : null,
      },
    });
    if (result.count !== 1) throw new TicketConflictError();

    await transaction.ticketActivity.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        type: "status_changed",
        summary: `Status changed from ${current.status} to ${nextStatus}`,
      },
    });
    return transaction.ticket.findFirstOrThrow({
      where: { id: ticketId, organizationId },
    });
  });
}

export async function changeTicketPriority(
  organizationId: string,
  ticketId: string,
  actorUserId: string,
  nextPriority: "low" | "normal" | "high" | "urgent",
  expectedVersion: number,
) {
  return db.$transaction(async (transaction) => {
    const current = await transaction.ticket.findFirst({
      where: { id: ticketId, organizationId },
      select: { priority: true, version: true },
    });
    if (!current) throw new TicketNotFoundError();
    if (current.version !== expectedVersion) throw new TicketConflictError();
    if (current.priority === nextPriority) throw new TicketTransitionError();

    const result = await transaction.ticket.updateMany({
      where: { id: ticketId, organizationId, version: expectedVersion },
      data: { priority: nextPriority, version: { increment: 1 } },
    });
    if (result.count !== 1) throw new TicketConflictError();

    await transaction.ticketActivity.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        type: "priority_changed",
        summary: `Priority changed from ${current.priority} to ${nextPriority}`,
      },
    });
    return transaction.ticket.findFirstOrThrow({
      where: { id: ticketId, organizationId },
    });
  });
}

export async function addTicketReply(
  organizationId: string,
  ticketId: string,
  actorUserId: string,
  body: string,
) {
  return db.$transaction(async (transaction) => {
    const updated = await transaction.ticket.updateMany({
      where: { id: ticketId, organizationId },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new TicketNotFoundError();

    const message = await transaction.ticketMessage.create({
      data: { organizationId, ticketId, authorUserId: actorUserId, body },
    });
    await transaction.ticketActivity.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        type: "reply_added",
        summary: "Customer-visible reply added",
      },
    });
    return message;
  });
}

export async function addInternalNote(
  organizationId: string,
  ticketId: string,
  actorUserId: string,
  body: string,
) {
  return db.$transaction(async (transaction) => {
    const updated = await transaction.ticket.updateMany({
      where: { id: ticketId, organizationId },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new TicketNotFoundError();

    const note = await transaction.internalNote.create({
      data: { organizationId, ticketId, authorUserId: actorUserId, body },
    });
    await transaction.ticketActivity.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        type: "note_added",
        summary: "Internal note added",
      },
    });
    return note;
  });
}

export async function assignTicket(
  organizationId: string,
  ticketId: string,
  actorUserId: string,
  membershipId: string,
  expectedVersion: number,
) {
  return db.$transaction(async (transaction) => {
    const current = await transaction.ticket.findFirst({
      where: { id: ticketId, organizationId },
      select: { version: true },
    });
    if (!current) throw new TicketNotFoundError();
    if (current.version !== expectedVersion) throw new TicketConflictError();

    const target = await transaction.membership.findFirst({
      where: { id: membershipId, organizationId, role: "agent" },
      select: { id: true, user: { select: { name: true } } },
    });
    if (!target) throw new TicketNotFoundError();

    const updated = await transaction.ticket.updateMany({
      where: { id: ticketId, organizationId, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new TicketConflictError();

    await transaction.assignment.updateMany({
      where: { ticketId, organizationId, endedAt: null },
      data: { endedAt: new Date() },
    });
    await transaction.assignment.create({
      data: {
        organizationId,
        ticketId,
        membershipId: target.id,
        actorUserId,
      },
    });
    await transaction.ticketActivity.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        type: "assigned",
        summary: `Ticket assigned to ${target.user.name}`,
      },
    });
    return { membershipId: target.id, assigneeName: target.user.name };
  });
}

export async function addTicketTag(
  organizationId: string,
  ticketId: string,
  actorUserId: string,
  name: string,
) {
  return db.$transaction(async (transaction) => {
    const ticket = await transaction.ticket.findFirst({
      where: { id: ticketId, organizationId },
      select: { id: true },
    });
    if (!ticket) throw new TicketNotFoundError();

    const tag = await transaction.tag.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    });
    const existing = await transaction.ticketTag.findUnique({
      where: { ticketId_tagId: { ticketId, tagId: tag.id } },
      select: { tagId: true },
    });
    if (!existing) {
      await transaction.ticketTag.create({
        data: { organizationId, ticketId, tagId: tag.id },
      });
      await transaction.ticket.update({
        where: { id: ticketId },
        data: { version: { increment: 1 } },
      });
      await transaction.ticketActivity.create({
        data: {
          organizationId,
          ticketId,
          actorUserId,
          type: "tag_added",
          summary: `Tag added: ${name}`,
        },
      });
    }
    return tag;
  });
}

export async function removeTicketTag(
  organizationId: string,
  ticketId: string,
  actorUserId: string,
  name: string,
) {
  return db.$transaction(async (transaction) => {
    const tag = await transaction.tag.findFirst({
      where: { organizationId, name },
      select: { id: true },
    });
    if (!tag) throw new TicketNotFoundError();

    const deleted = await transaction.ticketTag.deleteMany({
      where: { organizationId, ticketId, tagId: tag.id },
    });
    if (deleted.count === 0) throw new TicketNotFoundError();

    await transaction.ticket.updateMany({
      where: { id: ticketId, organizationId },
      data: { version: { increment: 1 } },
    });
    await transaction.ticketActivity.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        type: "tag_removed",
        summary: `Tag removed: ${name}`,
      },
    });
    return { removed: true };
  });
}
