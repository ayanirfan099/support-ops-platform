import { NextResponse } from "next/server";
import { z } from "zod";
import { OWNER_MANAGER } from "@supportops/contracts";
import { apiErrorResponse } from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { listAuditEvents } from "@/lib/audit";

const querySchema = z.object({
  organizationId: z.string().min(1).max(100),
  cursor: z.string().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const membership = await requireWorkspaceMembership(
      query.organizationId,
      OWNER_MANAGER,
    );
    return NextResponse.json(
      await listAuditEvents(membership.organizationId, query.cursor),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
