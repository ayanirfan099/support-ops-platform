import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyTicketText,
  IntelligenceUnavailableError,
  searchKnowledge,
} from "./intelligence";

const token = "local-test-intelligence-token-that-is-over-32-characters";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("internal intelligence client", () => {
  it("fails closed when the internal service token is not configured", async () => {
    vi.stubEnv("INTELLIGENCE_SERVICE_TOKEN", "");

    await expect(
      classifyTicketText({
        subject: "Password reset",
        description: "I cannot access my account after changing the password.",
      }),
    ).rejects.toBeInstanceOf(IntelligenceUnavailableError);
  });

  it("maps upstream errors and invalid responses to a retriable service error", async () => {
    vi.stubEnv("INTELLIGENCE_SERVICE_TOKEN", token);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "internal service error" }), {
        status: 503,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      classifyTicketText({
        subject: "Password reset",
        description: "I cannot access my account after changing the password.",
      }),
    ).rejects.toBeInstanceOf(IntelligenceUnavailableError);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ hits: [], insufficient_evidence: true }), {
        status: 200,
      }),
    );
    await expect(
      searchKnowledge({
        query: "account recovery",
        candidates: [],
        limit: 5,
      }),
    ).rejects.toBeInstanceOf(IntelligenceUnavailableError);
  });

  it("validates and returns a correctly shaped local classifier response", async () => {
    vi.stubEnv("INTELLIGENCE_SERVICE_TOKEN", token);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          suggested_queue: "account",
          scores: { billing: 0.1, account: 0.7, technical: 0.1, sales: 0.1 },
          model_version: "synthetic-mnb-test",
          abstained: false,
          abstention_reason: null,
          known_token_coverage: 0.75,
          score_warning: "Uncalibrated test scores.",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      classifyTicketText({
        subject: "Password reset",
        description: "I cannot access my account after changing the password.",
      }),
    ).resolves.toMatchObject({
      suggested_queue: "account",
      abstained: false,
      model_version: "synthetic-mnb-test",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(
      new URL("/v1/classify", "http://127.0.0.1:8001"),
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: `Bearer ${token}` }),
      }),
    );
  });
});
