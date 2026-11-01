import { describe, expect, it, vi } from "vitest";
import {
  MembershipRequiredError,
  RoleRequiredError,
  requireMembership,
  organizationCreateSchema,
} from "./index";
import type { MembershipLookup } from "./index";

const member = {
  userId: "user-a",
  organizationId: "org-a",
  role: "agent" as const,
};

function lookupReturning(result: typeof member | null): MembershipLookup {
  return { findForUserAndOrganization: vi.fn().mockResolvedValue(result) };
}

describe("workspace membership authorization", () => {
  it("resolves the user's membership for the selected workspace", async () => {
    const lookup = lookupReturning(member);
    await expect(requireMembership(lookup, "user-a", "org-a")).resolves.toEqual(
      member,
    );
    expect(lookup.findForUserAndOrganization).toHaveBeenCalledWith(
      "user-a",
      "org-a",
    );
  });

  it("denies guessed organization IDs with a non-enumerating error", async () => {
    const lookup = lookupReturning(null);
    await expect(
      requireMembership(lookup, "user-a", "org-b"),
    ).rejects.toBeInstanceOf(MembershipRequiredError);
  });

  it("rejects a repository result that does not match the authenticated user", async () => {
    const lookup = lookupReturning({ ...member, userId: "user-b" });
    await expect(
      requireMembership(lookup, "user-a", "org-a"),
    ).rejects.toBeInstanceOf(MembershipRequiredError);
  });

  it("enforces role requirements on the server-side membership", async () => {
    await expect(
      requireMembership(lookupReturning(member), "user-a", "org-a", [
        "owner",
        "manager",
      ]),
    ).rejects.toBeInstanceOf(RoleRequiredError);
  });
});

describe("organization input contract", () => {
  it("trims and bounds organization names", () => {
    expect(
      organizationCreateSchema.parse({ name: "  Acme Support  " }),
    ).toEqual({
      name: "Acme Support",
    });
    expect(organizationCreateSchema.safeParse({ name: " " }).success).toBe(
      false,
    );
    expect(organizationCreateSchema.safeParse({ name: "x" }).success).toBe(
      false,
    );
    expect(
      organizationCreateSchema.safeParse({ name: "x".repeat(81) }).success,
    ).toBe(false);
  });
});
