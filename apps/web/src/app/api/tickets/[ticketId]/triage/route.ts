import { NextResponse } from "next/server";
import { z } from "zod";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { suggestTicketTriage } from "@/lib/knowledge-triage";

const triageRequestSchema = z.object({
  organizationId: z.string().min(1).max(100),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, triageRequestSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { ticketId } = await params;
    const suggestion = await suggestTicketTriage(
      input.organizationId,
      ticketId,
      membership.userId,
    );
    return NextResponse.json(suggestion, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
