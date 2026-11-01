import { describe, expect, it } from "vitest";
import {
  knowledgeDocumentCreateSchema,
  knowledgeSearchResultSchema,
  knowledgeSearchSchema,
  triageReviewResultSchema,
  triageSuggestionResultSchema,
} from "./knowledge";

describe("knowledge request contracts", () => {
  it("accepts bounded plain text and normalizes the document title", () => {
    expect(
      knowledgeDocumentCreateSchema.parse({
        organizationId: "workspace-1",
        title: "  Fictional guide  ",
        content: "First line\nSecond line",
      }),
    ).toMatchObject({
      title: "Fictional guide",
      content: "First line\nSecond line",
    });
  });

  it("rejects blank or over-line-limit knowledge documents", () => {
    expect(
      knowledgeDocumentCreateSchema.safeParse({
        organizationId: "workspace-1",
        title: "Guide",
        content: " \n  \n",
      }).success,
    ).toBe(false);
    expect(
      knowledgeDocumentCreateSchema.safeParse({
        organizationId: "workspace-1",
        title: "Guide",
        content: Array.from({ length: 5_001 }, () => "line").join("\n"),
      }).success,
    ).toBe(false);
  });

  it("trims and bounds the workspace-scoped search query", () => {
    expect(
      knowledgeSearchSchema.parse({
        organizationId: "workspace-1",
        ticketId: "ticket-1",
        query: "  invoice refund  ",
      }).query,
    ).toBe("invoice refund");
    expect(
      knowledgeSearchSchema.safeParse({
        organizationId: "workspace-1",
        ticketId: "ticket-1",
        query: "    ",
      }).success,
    ).toBe(false);
  });

  it("validates line citations and persisted triage review metadata", () => {
    expect(
      knowledgeSearchResultSchema.safeParse({
        searchId: "search-1",
        rankerVersion: "bm25-test",
        insufficientEvidence: false,
        corpusTruncated: false,
        citations: [
          {
            documentId: "doc-1",
            title: "Billing guide",
            chunkId: "chunk-1",
            excerpt: "Request an invoice refund.",
            startLine: 3,
            endLine: 4,
            score: 0.42,
            rank: 1,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      triageSuggestionResultSchema.parse({
        suggestionId: "suggestion-1",
        suggestedQueue: "billing",
        scores: { billing: 0.7, account: 0.1, technical: 0.1, sales: 0.1 },
        modelVersion: "synthetic-test",
        abstained: false,
        abstentionReason: null,
        knownTokenCoverage: 0.8,
        scoreWarning: "Uncalibrated fixture scores.",
        reviewStatus: "pending",
        createdAt: "2026-11-01T12:00:00.000Z",
      }).reviewStatus,
    ).toBe("pending");
    expect(
      triageReviewResultSchema.parse({
        reviewStatus: "overridden",
        queue: "technical",
      }),
    ).toEqual({ reviewStatus: "overridden", queue: "technical" });
  });
});
