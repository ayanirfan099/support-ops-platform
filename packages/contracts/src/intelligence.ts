import { z } from "zod";

export const ticketQueueSchema = z.enum([
  "billing",
  "account",
  "technical",
  "sales",
]);
export type TicketQueue = z.infer<typeof ticketQueueSchema>;

export const intelligenceChunkRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(32_000),
});
export type IntelligenceChunkRequest = z.infer<
  typeof intelligenceChunkRequestSchema
>;

export const intelligenceChunkSchema = z.object({
  ordinal: z.number().int().nonnegative(),
  start_line: z.number().int().positive(),
  end_line: z.number().int().positive(),
  content: z.string().min(1).max(900),
});

export const intelligenceChunkResponseSchema = z.object({
  chunks: z.array(intelligenceChunkSchema).min(1).max(5_000),
  chunker_version: z.string().min(1).max(80),
});
export type IntelligenceChunkResponse = z.infer<
  typeof intelligenceChunkResponseSchema
>;

export const intelligenceSearchCandidateSchema = z.object({
  chunk_id: z.string().min(1).max(100),
  document_id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  start_line: z.number().int().positive(),
  end_line: z.number().int().positive(),
  content: z.string().min(1).max(900),
});

export const intelligenceSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(400),
  candidates: z.array(intelligenceSearchCandidateSchema).max(500),
  limit: z.number().int().min(1).max(5).default(5),
});
export type IntelligenceSearchRequest = z.infer<
  typeof intelligenceSearchRequestSchema
>;

export const intelligenceSearchResponseSchema = z.object({
  hits: z.array(
    z.object({
      chunk_id: z.string().min(1).max(100),
      score: z.number().nonnegative(),
    }),
  ),
  insufficient_evidence: z.boolean(),
  ranker_version: z.string().min(1).max(80),
});
export type IntelligenceSearchResponse = z.infer<
  typeof intelligenceSearchResponseSchema
>;

export const intelligenceClassifyRequestSchema = z.object({
  subject: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(10_000),
});
export type IntelligenceClassifyRequest = z.infer<
  typeof intelligenceClassifyRequestSchema
>;

export const intelligenceClassifyResponseSchema = z.object({
  suggested_queue: ticketQueueSchema.nullable(),
  scores: z.record(ticketQueueSchema, z.number().min(0).max(1)),
  model_version: z.string().min(1).max(80),
  abstained: z.boolean(),
  abstention_reason: z.string().max(80).nullable(),
  known_token_coverage: z.number().min(0).max(1),
  score_warning: z.string().max(200),
});
export type IntelligenceClassifyResponse = z.infer<
  typeof intelligenceClassifyResponseSchema
>;
