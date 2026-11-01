import { z } from "zod";

export const memberRoleSchema = z.enum(["owner", "manager", "agent"]);
export type MemberRole = z.infer<typeof memberRoleSchema>;

export const organizationCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});
export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;

export interface MembershipRecord {
  organizationId: string;
  userId: string;
  role: MemberRole;
}

export interface MembershipLookup {
  findForUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<MembershipRecord | null>;
}

export class MembershipRequiredError extends Error {
  readonly status = 404;

  constructor() {
    super("Workspace not found");
    this.name = "MembershipRequiredError";
  }
}

export class RoleRequiredError extends Error {
  readonly status = 403;

  constructor() {
    super("Insufficient permissions");
    this.name = "RoleRequiredError";
  }
}

/**
 * Resolve membership using the authenticated user's ID and the selected
 * organization. The organization ID is only a selector; it grants no access.
 */
export async function requireMembership(
  lookup: MembershipLookup,
  authenticatedUserId: string,
  selectedOrganizationId: string,
  allowedRoles?: readonly MemberRole[],
): Promise<MembershipRecord> {
  if (!authenticatedUserId || !selectedOrganizationId) {
    throw new MembershipRequiredError();
  }

  const membership = await lookup.findForUserAndOrganization(
    authenticatedUserId,
    selectedOrganizationId,
  );

  if (
    !membership ||
    membership.userId !== authenticatedUserId ||
    membership.organizationId !== selectedOrganizationId
  ) {
    throw new MembershipRequiredError();
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new RoleRequiredError();
  }

  return membership;
}

export const OWNER_MANAGER: readonly MemberRole[] = ["owner", "manager"];
export const OWNER_ONLY: readonly MemberRole[] = ["owner"];
