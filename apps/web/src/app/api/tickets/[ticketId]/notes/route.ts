import { NextResponse } from "next/server";
import { internalNoteSchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { addInternalNote } from "@/lib/tickets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, internalNoteSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { ticketId } = await params;
    const note = await addInternalNote(
      input.organizationId,
      ticketId,
      membership.userId,
      input.body,
    );
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
