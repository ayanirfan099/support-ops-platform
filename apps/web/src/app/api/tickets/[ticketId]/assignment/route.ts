import { NextResponse } from "next/server";
import { OWNER_MANAGER, assignmentSchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { assignTicket } from "@/lib/tickets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, assignmentSchema);
    const actor = await requireWorkspaceMembership(
      input.organizationId,
      OWNER_MANAGER,
    );
    const { ticketId } = await params;
    return NextResponse.json(
      await assignTicket(
        input.organizationId,
        ticketId,
        actor.userId,
        input.membershipId,
        input.expectedVersion,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
