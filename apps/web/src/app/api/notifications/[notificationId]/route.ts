import { NextResponse } from "next/server";
import { z } from "zod";
import {
  apiErrorResponse,
  assertSameOrigin,
  readValidatedJson,
} from "@/lib/api";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { markNotificationRead } from "@/lib/notification-feed";

const inputSchema = z.object({ organizationId: z.string().min(1).max(100) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    assertSameOrigin(request);
    const input = await readValidatedJson(request, inputSchema);
    const membership = await requireWorkspaceMembership(input.organizationId);
    const { notificationId } = await params;
    const result = await markNotificationRead(
      membership.organizationId,
      membership.userId,
      notificationId,
    );
    if (result.count === 0) {
      return NextResponse.json({ updated: false }, { status: 404 });
    }
    return NextResponse.json({ updated: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
