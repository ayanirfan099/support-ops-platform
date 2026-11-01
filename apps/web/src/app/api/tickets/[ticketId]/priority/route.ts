import { NextResponse } from "next/server";
import { priorityChangeSchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { changeTicketPriority } from "@/lib/tickets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, priorityChangeSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { ticketId } = await params;
    return NextResponse.json(
      await changeTicketPriority(
        input.organizationId,
        ticketId,
        membership.userId,
        input.priority,
        input.expectedVersion,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
