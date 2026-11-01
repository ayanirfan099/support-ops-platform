import { NextResponse } from "next/server";
import { ticketTagSchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { addTicketTag } from "@/lib/tickets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, ticketTagSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { ticketId } = await params;
    return NextResponse.json(
      await addTicketTag(
        input.organizationId,
        ticketId,
        membership.userId,
        input.name,
      ),
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
