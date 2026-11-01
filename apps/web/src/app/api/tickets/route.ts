import { NextResponse } from "next/server";
import {
  ticketCreateSchema,
  ticketListFiltersSchema,
} from "@supportops/contracts";
import { createTicket, listTickets } from "@/lib/tickets";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = ticketListFiltersSchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    await requireWorkspaceMembership(filters.organizationId);
    return NextResponse.json(await listTickets(filters));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, ticketCreateSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const ticket = await createTicket(input, membership.userId);
    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
