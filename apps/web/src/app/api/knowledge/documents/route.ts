import { NextResponse } from "next/server";
import { knowledgeDocumentCreateSchema } from "@supportops/contracts";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import {
  createKnowledgeDocument,
  listKnowledgeDocuments,
} from "@/lib/knowledge-triage";
import { z } from "zod";

const listSchema = z.object({ organizationId: z.string().min(1).max(100) });

export async function GET(request: Request) {
  try {
    const filters = listSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    await requireWorkspaceMembership(filters.organizationId);
    return NextResponse.json({
      documents: await listKnowledgeDocuments(filters.organizationId),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(
      request,
      knowledgeDocumentCreateSchema,
    );
    const membership = await requireWorkspaceMembership(input.organizationId);
    const document = await createKnowledgeDocument(input, membership.userId);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
