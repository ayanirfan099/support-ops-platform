import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@supportops/database";
import { getWorkspaceMetrics } from "../../src/lib/analytics";
import { listAuditEvents } from "../../src/lib/audit";
import {
  listNotifications,
  markNotificationRead,
} from "../../src/lib/notification-feed";
import { addTicketReply, assignTicket } from "../../src/lib/tickets";

const ownerId = randomUUID();
const agentId = randomUUID();
let organizationId = "";
let otherOrganizationId = "";
let agentMembershipId = "";
let activeTicketId = "";

beforeAll(async () => {
  const organization = await db.organization.create({
    data: { name: "M4 Metrics Workspace", slug: `m4-metrics-${randomUUID()}` },
  });
  organizationId = organization.id;
  const [owner, agent] = await Promise.all([
    db.membership.create({
      data: {
        organization: { connect: { id: organizationId } },
        role: "owner",
        user: {
          create: {
            id: ownerId,
            name: "Metrics Owner",
            email: `${ownerId}@example.invalid`,
          },
        },
      },
    }),
    db.membership.create({
      data: {
        organization: { connect: { id: organizationId } },
        role: "agent",
        user: {
          create: {
            id: agentId,
            name: "Metrics Agent",
            email: `${agentId}@example.invalid`,
          },
        },
      },
    }),
  ]);
  agentMembershipId = agent.id;
  const customer = await db.customer.create({
    data: {
      organizationId,
      name: "Metrics Test Customer",
      email: `${randomUUID()}@customer.example.invalid`,
    },
  });
  const [active, resolved, oldClosed] = await Promise.all([
    db.ticket.create({
      data: {
        organizationId,
        customerId: customer.id,
        subject: "Urgent billing question",
        description: "Metrics fixture.",
        status: "open",
        priority: "urgent",
        queue: "billing",
        slaTargetAt: new Date(Date.now() - 60_000),
      },
    }),
    db.ticket.create({
      data: {
        organizationId,
        customerId: customer.id,
        subject: "Resolved billing question",
        description: "Metrics fixture.",
        status: "resolved",
        resolvedAt: new Date(),
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    }),
    db.ticket.create({
      data: {
        organizationId,
        customerId: customer.id,
        subject: "Old closed question",
        description: "Metrics fixture.",
        status: "closed",
        resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);
  activeTicketId = active.id;
  expect(owner.role).toBe("owner");
  expect(resolved.id).not.toBe(oldClosed.id);
});

afterAll(async () => {
  if (organizationId) {
    await db.ticket.deleteMany({ where: { organizationId } });
    await db.customer.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
  }
  if (otherOrganizationId) {
    await db.organization.deleteMany({ where: { id: otherOrganizationId } });
  }
  await db.user.deleteMany({ where: { id: { in: [ownerId, agentId] } } });
  await db.$disconnect();
});

describe("M4 metrics, notifications, and audit records", () => {
  it("computes tenant-scoped metrics and atomically notifies assignment and mention recipients", async () => {
    const beforeAssignment = await getWorkspaceMetrics(organizationId);
    expect(beforeAssignment).toMatchObject({
      active: 1,
      total: 3,
      unassigned: 1,
      urgent: 1,
      slaAtRisk: 1,
      createdLast7Days: 1,
      resolvedLast7Days: 1,
      byQueue: [{ queue: "billing", count: 1 }],
    });

    await assignTicket(
      organizationId,
      activeTicketId,
      ownerId,
      agentMembershipId,
      0,
    );
    const assignedMetrics = await getWorkspaceMetrics(organizationId);
    expect(assignedMetrics.agentWorkload).toEqual([
      expect.objectContaining({ name: "Metrics Agent", activeTickets: 1 }),
    ]);
    const assignmentInbox = await listNotifications(organizationId, agentId);
    expect(assignmentInbox).toMatchObject({
      unreadCount: 1,
      items: [{ type: "assignment", ticket: { id: activeTicketId } }],
    });

    await addTicketReply(
      organizationId,
      activeTicketId,
      ownerId,
      `Hi @${agentId}@example.invalid, please take a look.`,
    );
    const publicReply = await db.ticketMessage.findFirstOrThrow({
      where: { ticketId: activeTicketId, organizationId },
    });
    expect(publicReply.body).toBe("Hi a teammate, please take a look.");
    expect(publicReply.body).not.toContain(`${agentId}@example.invalid`);

    const updatedInbox = await listNotifications(organizationId, agentId);
    expect(updatedInbox.unreadCount).toBe(2);
    expect(updatedInbox.items.map(({ type }) => type)).toEqual(
      expect.arrayContaining(["mention", "assignment"]),
    );
    const markResult = await markNotificationRead(
      organizationId,
      agentId,
      updatedInbox.items[0]!.id,
    );
    expect(markResult.count).toBe(1);
    await expect(
      listNotifications(organizationId, agentId),
    ).resolves.toMatchObject({
      unreadCount: 1,
    });

    const afterAssignment = await getWorkspaceMetrics(organizationId);
    expect(afterAssignment.unassigned).toBe(0);
    const audit = await listAuditEvents(organizationId);
    expect(audit.items.map(({ action }) => action)).toEqual(
      expect.arrayContaining(["ticket.reply_added", "ticket.assigned"]),
    );
    await expect(
      listNotifications(organizationId, randomUUID()),
    ).resolves.toMatchObject({ items: [], unreadCount: 0 });

    const otherOrganization = await db.organization.create({
      data: {
        name: "Another M4 Workspace",
        slug: `m4-other-${randomUUID()}`,
      },
    });
    otherOrganizationId = otherOrganization.id;
    await db.auditEvent.create({
      data: {
        organizationId: otherOrganization.id,
        action: "other.tenant.event",
        targetType: "test",
        targetId: "foreign",
        summary: "Must remain private",
      },
    });
    await expect(listAuditEvents(organizationId)).resolves.not.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ action: "other.tenant.event" }),
      ]),
    });
    await db.organization.delete({ where: { id: otherOrganization.id } });
    otherOrganizationId = "";
  });
});
