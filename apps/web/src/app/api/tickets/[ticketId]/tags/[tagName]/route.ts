import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse, assertSameOrigin } from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { removeTicketTag } from "@/lib/tickets";

const organizationSchema = z.object({
  organizationId: z.string().min(1).max(100),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ticketId: string; tagName: string }> },
) {
  try {
    assertSameOrigin(request);
    const organization = organizationSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const membership = await requireWorkspaceMembership(
      organization.organizationId,
    );
    const { ticketId, tagName } = await params;
    return NextResponse.json(
      await removeTicketTag(
        organization.organizationId,
        ticketId,
        membership.userId,
        tagName.toLowerCase(),
      ),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
