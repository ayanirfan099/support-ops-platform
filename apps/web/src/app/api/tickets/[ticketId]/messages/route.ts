import { NextResponse } from "next/server";
import { ticketReplySchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { addTicketReply } from "@/lib/tickets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, ticketReplySchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { ticketId } = await params;
    const message = await addTicketReply(
      input.organizationId,
      ticketId,
      membership.userId,
      input.body,
    );
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
