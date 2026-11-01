import { NextResponse } from "next/server";
import { knowledgeSearchSchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { searchKnowledgeForTicket } from "@/lib/knowledge-triage";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, knowledgeSearchSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    return NextResponse.json(
      await searchKnowledgeForTicket(input, membership.userId),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
