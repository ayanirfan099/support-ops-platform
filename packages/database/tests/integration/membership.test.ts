import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/index";
import { findMembershipForUser } from "../../src/membership";
import { randomUUID } from "node:crypto";

const userIds = [randomUUID(), randomUUID()];
const organizationIds: string[] = [];

beforeAll(async () => {
  const organizations = await Promise.all([
    db.organization.create({
      data: { name: "Tenant A fixture", slug: `tenant-a-${randomUUID()}` },
    }),
    db.organization.create({
      data: { name: "Tenant B fixture", slug: `tenant-b-${randomUUID()}` },
    }),
  ]);
  organizationIds.push(...organizations.map(({ id }) => id));
  await Promise.all(
    userIds.map((id, index) =>
      db.user.create({
        data: {
          id,
          name: `Fixture User ${index + 1}`,
          email: `fixture-${id}@example.invalid`,
          memberships: {
            create: {
              organizationId: organizationIds[index],
              role: "agent",
            },
          },
        },
      }),
    ),
  );
});

afterAll(async () => {
  await db.membership.deleteMany({ where: { userId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.organization.deleteMany({ where: { id: { in: organizationIds } } });
  await db.$disconnect();
});

describe("tenant-scoped membership lookup", () => {
  it("returns only the authenticated user's membership", async () => {
    const membership = await findMembershipForUser(
      userIds[0],
      organizationIds[0],
    );
    expect(membership).toMatchObject({
      userId: userIds[0],
      organizationId: organizationIds[0],
      role: "agent",
    });
  });

  it("does not disclose another organization's membership by guessed ID", async () => {
    await expect(
      findMembershipForUser(userIds[0], organizationIds[1]),
    ).resolves.toBeNull();
  });
});
