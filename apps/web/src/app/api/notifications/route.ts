import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { listNotifications } from "@/lib/notification-feed";
import { apiErrorResponse } from "@/lib/api";

const querySchema = z.object({
  organizationId: z.string().min(1).max(100),
  cursor: z.string().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const membership = await requireWorkspaceMembership(query.organizationId);
    return NextResponse.json(
      await listNotifications(
        membership.organizationId,
        membership.userId,
        query.cursor,
      ),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
