import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@supportops/database";

vi.mock("../../src/lib/intelligence", () => ({
  chunkKnowledgeText: async ({
    content,
  }: {
    title: string;
    content: string;
  }) => ({
    chunks: [
      {
        ordinal: 0,
        start_line: 2,
        end_line: 3,
        content,
      },
    ],
    chunker_version: "test-line-chunker-v1",
  }),
  searchKnowledge: async ({
    candidates,
  }: {
    candidates: Array<{ chunk_id: string }>;
  }) => ({
    hits: candidates.length
      ? [{ chunk_id: candidates[0]!.chunk_id, score: 0.42 }]
      : [],
    insufficient_evidence: candidates.length === 0,
    ranker_version: "test-bm25-v1",
  }),
  classifyTicketText: async () => ({
    suggested_queue: "billing",
    scores: { billing: 0.82, account: 0.07, technical: 0.06, sales: 0.05 },
    model_version: "test-fixture-v1",
    abstained: false,
    abstention_reason: null,
    known_token_coverage: 0.8,
    score_warning: "Synthetic test scores only.",
  }),
}));

import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  KnowledgeDocumentNotFoundError,
  listKnowledgeDocuments,
  reviewTriageSuggestion,
  searchKnowledgeForTicket,
  suggestTicketTriage,
} from "../../src/lib/knowledge-triage";
import { TicketNotFoundError } from "../../src/lib/tickets";

const userIds = [randomUUID(), randomUUID()];
const organizationIds: string[] = [];
const ticketIds: string[] = [];

beforeAll(async () => {
  const organizations = await Promise.all([
    db.organization.create({
      data: { name: "Knowledge Tenant A", slug: `knowledge-a-${randomUUID()}` },
    }),
    db.organization.create({
      data: { name: "Knowledge Tenant B", slug: `knowledge-b-${randomUUID()}` },
    }),
  ]);
  organizationIds.push(...organizations.map(({ id }) => id));

  await Promise.all(
    organizations.map((organization, index) =>
      db.membership.create({
        data: {
          organization: { connect: { id: organization.id } },
          role: "agent",
          user: {
            create: {
              id: userIds[index]!,
              name: `Knowledge Agent ${index}`,
              email: `${userIds[index]}@example.invalid`,
            },
          },
        },
      }),
    ),
  );

  const customers = await Promise.all(
    organizationIds.map((organizationId, index) =>
      db.customer.create({
        data: {
          organizationId,
          name: `Knowledge Customer ${index}`,
          email: `${userIds[index]}@customer.example.invalid`,
        },
      }),
    ),
  );
  const tickets = await Promise.all(
    customers.map((customer, index) =>
      db.ticket.create({
        data: {
          organizationId: organizationIds[index]!,
          customerId: customer.id,
          subject: "Invoice payment support",
          description: "I was charged twice for my subscription invoice.",
        },
      }),
    ),
  );
  ticketIds.push(...tickets.map(({ id }) => id));
});

afterAll(async () => {
  await db.ticket.deleteMany({
    where: { organizationId: { in: organizationIds } },
  });
  await db.customer.deleteMany({
    where: { organizationId: { in: organizationIds } },
  });
  await db.organization.deleteMany({ where: { id: { in: organizationIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

describe("tenant-scoped knowledge and human-reviewed triage", () => {
  it("persists text excerpts and exact citations only for the selected workspace", async () => {
    const documents = await Promise.all(
      organizationIds.map((organizationId, index) =>
        createKnowledgeDocument(
          {
            organizationId,
            title: `Fictional guide ${index}`,
            content:
              "Intro\nInvoice refunds begin here.\nAsk billing for a receipt.",
          },
          userIds[index]!,
        ),
      ),
    );

    const visibleDocuments = await listKnowledgeDocuments(organizationIds[0]!);
    expect(visibleDocuments.map(({ id }) => id)).toEqual([documents[0]!.id]);

    const result = await searchKnowledgeForTicket(
      {
        organizationId: organizationIds[0]!,
        ticketId: ticketIds[0]!,
        query: "invoice refund",
      },
      userIds[0]!,
    );
    expect(result.citations).toMatchObject([
      {
        documentId: documents[0]!.id,
        title: "Fictional guide 0",
        startLine: 2,
        endLine: 3,
        excerpt:
          "Intro\nInvoice refunds begin here.\nAsk billing for a receipt.",
        rank: 1,
      },
    ]);
    expect(result.insufficientEvidence).toBe(false);
    await expect(
      db.knowledgeCitation.count({ where: { searchId: result.searchId } }),
    ).resolves.toBe(1);

    await expect(
      deleteKnowledgeDocument(
        organizationIds[0]!,
        documents[1]!.id,
        userIds[0]!,
      ),
    ).rejects.toBeInstanceOf(KnowledgeDocumentNotFoundError);
    expect(
      await db.knowledgeDocument.findUnique({
        where: { id: documents[1]!.id },
      }),
    ).not.toBeNull();
    await deleteKnowledgeDocument(
      organizationIds[0]!,
      documents[0]!.id,
      userIds[0]!,
    );
    await expect(
      db.knowledgeChunk.count({
        where: { organizationId: organizationIds[0] },
      }),
    ).resolves.toBe(0);
    await expect(
      db.knowledgeCitation.count({ where: { searchId: result.searchId } }),
    ).resolves.toBe(0);

    await expect(
      searchKnowledgeForTicket(
        {
          organizationId: organizationIds[0]!,
          ticketId: ticketIds[1]!,
          query: "invoice refund",
        },
        userIds[0]!,
      ),
    ).rejects.toBeInstanceOf(TicketNotFoundError);
  });

  it("keeps suggestions separate until an authorized human decision is recorded", async () => {
    await expect(
      suggestTicketTriage(organizationIds[0]!, ticketIds[1]!, userIds[0]!),
    ).rejects.toBeInstanceOf(TicketNotFoundError);

    const suggestion = await suggestTicketTriage(
      organizationIds[0]!,
      ticketIds[0]!,
      userIds[0]!,
    );
    expect(suggestion).toMatchObject({
      suggestedQueue: "billing",
      reviewStatus: "pending",
      abstained: false,
    });
    await expect(
      db.ticket.findUniqueOrThrow({ where: { id: ticketIds[0] } }),
    ).resolves.toMatchObject({ queue: null, version: 0 });

    const override = await reviewTriageSuggestion(
      organizationIds[0]!,
      ticketIds[0]!,
      suggestion.suggestionId,
      userIds[0]!,
      {
        organizationId: organizationIds[0]!,
        queue: "technical",
        expectedVersion: 0,
        reason: "Human review",
      },
    );
    expect(override).toEqual({
      reviewStatus: "overridden",
      queue: "technical",
    });
    await expect(
      db.ticket.findUniqueOrThrow({ where: { id: ticketIds[0] } }),
    ).resolves.toMatchObject({ queue: "technical", version: 1 });
    await expect(
      db.classificationSuggestion.findUniqueOrThrow({
        where: { id: suggestion.suggestionId },
      }),
    ).resolves.toMatchObject({
      suggestedQueue: "billing",
      reviewedQueue: "technical",
      reviewStatus: "overridden",
      reviewerUserId: userIds[0],
      reviewReason: "Human review",
    });

    await expect(
      reviewTriageSuggestion(
        organizationIds[0]!,
        ticketIds[1]!,
        suggestion.suggestionId,
        userIds[0]!,
        {
          organizationId: organizationIds[0]!,
          queue: "billing",
          expectedVersion: 0,
        },
      ),
    ).rejects.toBeInstanceOf(TicketNotFoundError);
  });
});
