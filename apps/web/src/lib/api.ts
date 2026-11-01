import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import {
  MembershipRequiredError,
  RoleRequiredError,
} from "@supportops/contracts";
import {
  TicketConflictError,
  TicketNotFoundError,
  TicketTransitionError,
} from "./tickets";

const MAX_JSON_BYTES = 64 * 1024;

export class InvalidRequestError extends Error {
  readonly status = 400;
}

export class PayloadTooLargeError extends Error {
  readonly status = 413;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new InvalidRequestError();

  let candidate: URL;
  try {
    candidate = new URL(origin);
  } catch {
    throw new InvalidRequestError();
  }

  const configuredBaseUrl =
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  try {
    if (candidate.origin === new URL(configuredBaseUrl).origin) return;
  } catch {
    throw new InvalidRequestError();
  }

  const isArenaPreview =
    process.env.NODE_ENV !== "production" &&
    candidate.protocol === "https:" &&
    /^\d+-[a-z0-9-]+\.e2b\.app$/i.test(candidate.hostname) &&
    !candidate.port;
  if (!isArenaPreview) throw new InvalidRequestError();
}

export async function readValidatedJson<TSchema extends ZodType>(
  request: Request,
  schema: TSchema,
): Promise<TSchema["_output"]> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    throw new PayloadTooLargeError();
  }
  if (!request.body) throw new InvalidRequestError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_JSON_BYTES) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new InvalidRequestError();
  }
  return schema.parse(parsed);
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof MembershipRequiredError) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  if (error instanceof RoleRequiredError) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }
  if (error instanceof TicketNotFoundError) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (
    error instanceof TicketConflictError ||
    error instanceof TicketTransitionError
  ) {
    return NextResponse.json(
      { error: "Ticket update conflict. Refresh and try again." },
      { status: 409 },
    );
  }
  if (error instanceof PayloadTooLargeError) {
    return NextResponse.json(
      { error: "Request body is too large" },
      { status: 413 },
    );
  }
  if (error instanceof InvalidRequestError || error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  console.error("api.request failed", {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  return NextResponse.json(
    { error: "Unable to complete request" },
    { status: 500 },
  );
}
