import { headers } from "next/headers";
import {
  requireMembership,
  type MemberRole,
  type MembershipLookup,
} from "@supportops/contracts";
import { findMembershipForUser } from "@supportops/database/membership";
import { auth } from "./auth";

const membershipLookup: MembershipLookup = {
  findForUserAndOrganization: findMembershipForUser,
};

/** Every tenant-owned server operation must resolve membership before querying data. */
export async function requireWorkspaceMembership(
  organizationId: string,
  allowedRoles?: readonly MemberRole[],
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }

  return requireMembership(
    membershipLookup,
    session.user.id,
    organizationId,
    allowedRoles,
  );
}
