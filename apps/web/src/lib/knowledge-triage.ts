import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  knowledgeSearchResultSchema,
  triageReviewResultSchema,
  triageSuggestionResultSchema,
  type KnowledgeDocumentCreateInput,
  type KnowledgeSearchInput,
  type TriageReviewInput,
  type TicketQueue,
} from "@supportops/contracts";
import { db } from "@supportops/database";
import {
  chunkKnowledgeText,
  classifyTicketText,
  searchKnowledge,
} from "./intelligence";
import { TicketConflictError, TicketNotFoundError } from "./tickets";

const MAX_SEARCH_CHUNKS = 500;

export class KnowledgeDocumentNotFoundError extends Error {
  constructor() {
    super("Knowledge document not found");
    this.name = "KnowledgeDocumentNotFoundError";
  }
}

export class TriageSuggestionNotFoundError extends Error {
  constructor() {
    super("Triage suggestion not found");
    this.name = "TriageSuggestionNotFoundError";
  }
}

export async function listKnowledgeDocuments(organizationId: string) {
  return db.knowledgeDocument.findMany({
    where: { organizationId },
    select: {
      id: true,
      title: true,
      contentHash: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { chunks: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
}

export async function deleteKnowledgeDocument(
  organizationId: string,
  documentId: string,
) {
  const result = await db.knowledgeDocument.deleteMany({
    where: { id: documentId, organizationId },
  });
  if (result.count !== 1) throw new KnowledgeDocumentNotFoundError();
}

export async function createKnowledgeDocument(
  input: KnowledgeDocumentCreateInput,
  creatorUserId: string,
) {
  const normalizedContent = input.content.replace(/\r\n?/g, "\n");
  const chunked = await chunkKnowledgeText({
    title: input.title,
    content: normalizedContent,
  });
  const contentHash = createHash("sha256")
    .update(normalizedContent)
    .digest("hex");

  return db.$transaction(async (transaction) => {
    const document = await transaction.knowledgeDocument.create({
      data: {
        organizationId: input.organizationId,
        createdByUserId: creatorUserId,
        title: input.title,
        content: normalizedContent,
        contentHash,
      },
    });
    await transaction.knowledgeChunk.createMany({
      data: chunked.chunks.map((chunk) => ({
        organizationId: input.organizationId,
        documentId: document.id,
        ordinal: chunk.ordinal,
        content: chunk.content,
        startLine: chunk.start_line,
        endLine: chunk.end_line,
      })),
    });
    return {
      id: document.id,
      title: document.title,
      contentHash: document.contentHash,
      chunkCount: chunked.chunks.length,
      chunkerVersion: chunked.chunker_version,
      createdAt: document.createdAt,
    };
  });
}

export async function searchKnowledgeForTicket(
  input: KnowledgeSearchInput,
  actorUserId: string,
) {
  const ticket = await db.ticket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!ticket) throw new TicketNotFoundError();

  const [totalChunks, chunks] = await Promise.all([
    db.knowledgeChunk.count({
      where: { organizationId: input.organizationId },
    }),
    db.knowledgeChunk.findMany({
      where: { organizationId: input.organizationId },
      select: {
        id: true,
        documentId: true,
        content: true,
        startLine: true,
        endLine: true,
        document: { select: { title: true } },
      },
      orderBy: [
        { document: { updatedAt: "desc" } },
        { documentId: "asc" },
        { ordinal: "asc" },
      ],
      take: MAX_SEARCH_CHUNKS,
    }),
  ]);

  const searchResult = await searchKnowledge({
    query: input.query,
    candidates: chunks.map((chunk) => ({
      chunk_id: chunk.id,
      document_id: chunk.documentId,
      title: chunk.document.title,
      start_line: chunk.startLine,
      end_line: chunk.endLine,
      content: chunk.content,
    })),
    limit: 5,
  });
  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk] as const));
  const uniqueHits = searchResult.hits
    .filter(
      (hit, index, hits) =>
        hits.findIndex(({ chunk_id }) => chunk_id === hit.chunk_id) === index,
    )
    .filter((hit) => chunksById.has(hit.chunk_id))
    .slice(0, 5);
  const queryHash = createHash("sha256").update(input.query).digest("hex");

  return db.$transaction(async (transaction) => {
    const search = await transaction.knowledgeSearch.create({
      data: {
        organizationId: input.organizationId,
        ticketId: input.ticketId,
        actorUserId,
        queryHash,
        rankerVersion: searchResult.ranker_version,
      },
    });
    const citations = uniqueHits.map((hit, index) => {
      const chunk = chunksById.get(hit.chunk_id)!;
      return {
        documentId: chunk.documentId,
        title: chunk.document.title,
        chunkId: chunk.id,
        excerpt: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        score: hit.score,
        rank: index + 1,
      };
    });
    if (citations.length) {
      await transaction.knowledgeCitation.createMany({
        data: citations.map((citation) => ({
          organizationId: input.organizationId,
          searchId: search.id,
          chunkId: citation.chunkId,
          rank: citation.rank,
          score: citation.score,
          titleSnapshot: citation.title,
          excerpt: citation.excerpt,
          startLine: citation.startLine,
          endLine: citation.endLine,
        })),
      });
    }
    await transaction.ticketActivity.create({
      data: {
        organizationId: input.organizationId,
        ticketId: input.ticketId,
        actorUserId,
        type: "knowledge_searched",
        summary: citations.length
          ? `Knowledge search returned ${citations.length} citation${citations.length === 1 ? "" : "s"}`
          : "Knowledge search found insufficient evidence",
      },
    });
    return knowledgeSearchResultSchema.parse({
      searchId: search.id,
      rankerVersion: search.rankerVersion,
      insufficientEvidence:
        searchResult.insufficient_evidence || citations.length === 0,
      corpusTruncated: totalChunks > MAX_SEARCH_CHUNKS,
      citations,
    });
  });
}

export async function suggestTicketTriage(
  organizationId: string,
  ticketId: string,
  actorUserId: string,
) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, organizationId },
    select: { id: true, subject: true, description: true },
  });
  if (!ticket) throw new TicketNotFoundError();

  // Only the original customer request is classified; replies and internal notes are excluded.
  const result = await classifyTicketText({
    subject: ticket.subject,
    description: ticket.description,
  });
  return db.$transaction(async (transaction) => {
    const suggestion = await transaction.classificationSuggestion.create({
      data: {
        organizationId,
        ticketId,
        suggestedQueue: result.suggested_queue,
        scores: result.scores as Prisma.InputJsonValue,
        modelVersion: result.model_version,
        abstained: result.abstained,
        abstentionReason: result.abstention_reason,
      },
    });
    await transaction.ticketActivity.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        type: "triage_suggested",
        summary: result.abstained
          ? "Triage abstained; human review required"
          : `Triage suggested ${result.suggested_queue}`,
      },
    });
    return triageSuggestionResultSchema.parse({
      suggestionId: suggestion.id,
      suggestedQueue: suggestion.suggestedQueue,
      scores: result.scores,
      modelVersion: suggestion.modelVersion,
      abstained: suggestion.abstained,
      abstentionReason: suggestion.abstentionReason,
      knownTokenCoverage: result.known_token_coverage,
      scoreWarning:
        "Uncalibrated synthetic-fixture ranking scores; not probabilities.",
      reviewStatus: suggestion.reviewStatus,
      createdAt: suggestion.createdAt.toISOString(),
    });
  });
}

export async function reviewTriageSuggestion(
  organizationId: string,
  ticketId: string,
  suggestionId: string,
  actorUserId: string,
  input: TriageReviewInput,
) {
  return db.$transaction(async (transaction) => {
    const [ticket, suggestion] = await Promise.all([
      transaction.ticket.findFirst({
        where: { id: ticketId, organizationId },
        select: { version: true },
      }),
      transaction.classificationSuggestion.findFirst({
        where: {
          id: suggestionId,
          ticketId,
          organizationId,
          reviewStatus: "pending",
        },
        select: { suggestedQueue: true, abstained: true },
      }),
    ]);
    if (!ticket) throw new TicketNotFoundError();
    if (!suggestion) throw new TriageSuggestionNotFoundError();
    if (ticket.version !== input.expectedVersion)
      throw new TicketConflictError();

    const reviewStatus =
      !suggestion.abstained && suggestion.suggestedQueue === input.queue
        ? "accepted"
        : "overridden";
    const update = await transaction.ticket.updateMany({
      where: { id: ticketId, organizationId, version: input.expectedVersion },
      data: { queue: input.queue, version: { increment: 1 } },
    });
    if (update.count !== 1) throw new TicketConflictError();

    const reviewed = await transaction.classificationSuggestion.updateMany({
      where: {
        id: suggestionId,
        ticketId,
        organizationId,
        reviewStatus: "pending",
      },
      data: {
        reviewStatus,
        reviewedQueue: input.queue,
        reviewReason: input.reason,
        reviewerUserId: actorUserId,
        reviewedAt: new Date(),
      },
    });
    if (reviewed.count !== 1) throw new TicketConflictError();

    await transaction.ticketActivity.create({
      data: {
        organizationId,
        ticketId,
        actorUserId,
        type: "triage_reviewed",
        summary:
          reviewStatus === "accepted"
            ? `Triage suggestion accepted: ${input.queue}`
            : `Triage overridden by human review: ${input.queue}`,
      },
    });
    return triageReviewResultSchema.parse({
      reviewStatus,
      queue: input.queue,
    });
  });
}

export function queueLabel(queue: TicketQueue | null) {
  return queue ? queue[0]!.toUpperCase() + queue.slice(1) : "Not set";
}
