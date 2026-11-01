import type { z } from "zod";
import {
  intelligenceChunkResponseSchema,
  intelligenceClassifyResponseSchema,
  intelligenceSearchResponseSchema,
  type IntelligenceChunkRequest,
  type IntelligenceClassifyRequest,
  type IntelligenceSearchRequest,
} from "@supportops/contracts";

export class IntelligenceUnavailableError extends Error {
  constructor() {
    super("The local intelligence service is unavailable. Try again later.");
    this.name = "IntelligenceUnavailableError";
  }
}

const requestTimeoutMs = 4_000;

async function postValidated<TSchema extends z.ZodType>(
  path: string,
  payload: unknown,
  schema: TSchema,
): Promise<TSchema["_output"]> {
  const baseUrl =
    process.env.INTELLIGENCE_SERVICE_URL ?? "http://127.0.0.1:8001";
  const token = process.env.INTELLIGENCE_SERVICE_TOKEN;
  if (!token || token.length < 32) throw new IntelligenceUnavailableError();

  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: "POST",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (!response.ok) throw new Error("upstream rejected the request");
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success)
      throw new Error("upstream returned an invalid response");
    return parsed.data;
  } catch {
    throw new IntelligenceUnavailableError();
  }
}

export function chunkKnowledgeText(payload: IntelligenceChunkRequest) {
  return postValidated("/v1/chunks", payload, intelligenceChunkResponseSchema);
}

export function searchKnowledge(payload: IntelligenceSearchRequest) {
  return postValidated("/v1/search", payload, intelligenceSearchResponseSchema);
}

export function classifyTicketText(payload: IntelligenceClassifyRequest) {
  return postValidated(
    "/v1/classify",
    payload,
    intelligenceClassifyResponseSchema,
  );
}
