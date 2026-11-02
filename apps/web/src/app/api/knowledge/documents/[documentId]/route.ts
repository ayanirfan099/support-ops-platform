import { NextResponse } from "next/server";
import { z } from "zod";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { deleteKnowledgeDocument } from "@/lib/knowledge-triage";

const deleteSchema = z.object({ organizationId: z.string().min(1).max(100) });

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, deleteSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { documentId } = await params;
    await deleteKnowledgeDocument(
      membership.organizationId,
      documentId,
      membership.userId,
    );
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
