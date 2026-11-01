import type { PrismaClient } from "@prisma/client";
import { db } from "./index";

export interface MembershipLookupClient {
  membership: PrismaClient["membership"];
}

/** A tenant-scoped lookup; never use an organization ID without the user ID. */
export async function findMembershipForUser(
  userId: string,
  organizationId: string,
  client: MembershipLookupClient = db,
) {
  return client.membership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
    select: {
      userId: true,
      organizationId: true,
      role: true,
    },
  });
}
