import { NextResponse } from "next/server";
import { transitionTicketSchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { transitionTicket } from "@/lib/tickets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, transitionTicketSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { ticketId } = await params;
    const ticket = await transitionTicket(
      input.organizationId,
      ticketId,
      membership.userId,
      input.status,
      input.expectedVersion,
    );
    return NextResponse.json(ticket);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
