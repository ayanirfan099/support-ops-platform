import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@supportops/database";
import {
  listTickets,
  getTicket,
  assignTicket,
  TicketNotFoundError,
} from "../../src/lib/tickets";

const ids = {
  userA: randomUUID(),
  userB: randomUUID(),
};
const organizationIds: string[] = [];
const membershipIds: string[] = [];
let ticketAId = "";
let ticketBId = "";

beforeAll(async () => {
  const organizations = await Promise.all([
    db.organization.create({
      data: {
        name: "Ticket Tenant A",
        slug: `ticket-tenant-a-${randomUUID()}`,
      },
    }),
    db.organization.create({
      data: {
        name: "Ticket Tenant B",
        slug: `ticket-tenant-b-${randomUUID()}`,
      },
    }),
  ]);
  organizationIds.push(...organizations.map(({ id }) => id));

  const memberships = await Promise.all([
    db.membership.create({
      data: {
        organization: { connect: { id: organizationIds[0] } },
        role: "owner",
        user: {
          create: {
            id: ids.userA,
            name: "Tenant A Agent",
            email: `${ids.userA}@example.invalid`,
          },
        },
      },
    }),
    db.membership.create({
      data: {
        organization: { connect: { id: organizationIds[1] } },
        role: "agent",
        user: {
          create: {
            id: ids.userB,
            name: "Tenant B Agent",
            email: `${ids.userB}@example.invalid`,
          },
        },
      },
    }),
  ]);
  membershipIds.push(...memberships.map(({ id }) => id));

  const customerA = await db.customer.create({
    data: {
      organizationId: organizationIds[0],
      name: "Customer A",
      email: "a@example.invalid",
    },
  });
  const customerB = await db.customer.create({
    data: {
      organizationId: organizationIds[1],
      name: "Customer B",
      email: "b@example.invalid",
    },
  });
  const tickets = await Promise.all([
    db.ticket.create({
      data: {
        organizationId: organizationIds[0],
        customerId: customerA.id,
        subject: "Tenant A secret issue",
        description: "Only tenant A should see this.",
      },
    }),
    db.ticket.create({
      data: {
        organizationId: organizationIds[1],
        customerId: customerB.id,
        subject: "Tenant B secret issue",
        description: "Only tenant B should see this.",
      },
    }),
  ]);
  [ticketAId, ticketBId] = tickets.map(({ id }) => id);
});

afterAll(async () => {
  await db.ticket.deleteMany({
    where: { organizationId: { in: organizationIds } },
  });
  await db.customer.deleteMany({
    where: { organizationId: { in: organizationIds } },
  });
  await db.organization.deleteMany({ where: { id: { in: organizationIds } } });
  await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await db.$disconnect();
});

describe("tenant-scoped ticket operations", () => {
  it("lists and reads only tickets in the requested workspace", async () => {
    const result = await listTickets({
      organizationId: organizationIds[0],
      page: 1,
      pageSize: 25,
    });
    expect(result.items.map(({ id }) => id)).toContain(ticketAId);
    expect(result.items.map(({ id }) => id)).not.toContain(ticketBId);
    await expect(
      getTicket(organizationIds[0], ticketBId),
    ).rejects.toBeInstanceOf(TicketNotFoundError);
  });

  it("rejects assignment to a membership from another tenant without changing the ticket", async () => {
    await expect(
      assignTicket(
        organizationIds[0],
        ticketAId,
        ids.userA,
        membershipIds[1],
        0,
      ),
    ).rejects.toBeInstanceOf(TicketNotFoundError);
    await expect(
      db.ticket.findUniqueOrThrow({ where: { id: ticketAId } }),
    ).resolves.toMatchObject({ version: 0 });
    await expect(
      db.assignment.count({ where: { ticketId: ticketAId } }),
    ).resolves.toBe(0);
  });
});
