import { NextResponse } from "next/server";
import { z } from "zod";
import { getTicket } from "@/lib/tickets";
import { apiErrorResponse } from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";

const ticketReadSchema = z.object({
  organizationId: z.string().min(1).max(100),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const { ticketId } = await params;
    const parsed = ticketReadSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    await requireWorkspaceMembership(parsed.organizationId);
    return NextResponse.json(await getTicket(parsed.organizationId, ticketId));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
