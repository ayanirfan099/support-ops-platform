import { NextResponse } from "next/server";
import { triageReviewSchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { reviewTriageSuggestion } from "@/lib/knowledge-triage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string; suggestionId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, triageReviewSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { ticketId, suggestionId } = await params;
    const result = await reviewTriageSuggestion(
      input.organizationId,
      ticketId,
      suggestionId,
      membership.userId,
      input,
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
