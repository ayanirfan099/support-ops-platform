import { z } from "zod";
import { ticketQueueSchema } from "./intelligence";

export const knowledgeDocumentCreateSchema = z.object({
  organizationId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  content: z
    .string()
    .min(1)
    .max(32_000)
    .refine((content) => content.trim().length > 0)
    .refine((content) => content.split(/\r\n|\n|\r/).length <= 5_000),
});
export type KnowledgeDocumentCreateInput = z.infer<
  typeof knowledgeDocumentCreateSchema
>;

export const knowledgeSearchSchema = z.object({
  organizationId: z.string().min(1).max(100),
  ticketId: z.string().min(1).max(100),
  query: z.string().trim().min(1).max(400),
});
export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>;

export const knowledgeCitationSchema = z.object({
  documentId: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  chunkId: z.string().min(1).max(100),
  excerpt: z.string().min(1).max(900),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  score: z.number().nonnegative(),
  rank: z.number().int().positive(),
});

export const knowledgeSearchResultSchema = z.object({
  searchId: z.string().min(1).max(100),
  rankerVersion: z.string().min(1).max(80),
  insufficientEvidence: z.boolean(),
  corpusTruncated: z.boolean(),
  citations: z.array(knowledgeCitationSchema).max(5),
});
export type KnowledgeSearchResult = z.infer<typeof knowledgeSearchResultSchema>;

export const triageReviewStatusSchema = z.enum([
  "pending",
  "accepted",
  "overridden",
]);

export const triageSuggestionResultSchema = z.object({
  suggestionId: z.string().min(1).max(100),
  suggestedQueue: ticketQueueSchema.nullable(),
  scores: z.record(ticketQueueSchema, z.number().min(0).max(1)),
  modelVersion: z.string().min(1).max(80),
  abstained: z.boolean(),
  abstentionReason: z.string().max(80).nullable(),
  knownTokenCoverage: z.number().min(0).max(1),
  scoreWarning: z.string().max(200),
  reviewStatus: triageReviewStatusSchema,
  createdAt: z.string().datetime(),
});
export type TriageSuggestionResult = z.infer<
  typeof triageSuggestionResultSchema
>;

export const triageReviewResultSchema = z.object({
  reviewStatus: z.enum(["accepted", "overridden"]),
  queue: ticketQueueSchema,
});
export type TriageReviewResult = z.infer<typeof triageReviewResultSchema>;

export const triageReviewSchema = z.object({
  organizationId: z.string().min(1).max(100),
  queue: ticketQueueSchema,
  reason: z.string().trim().max(500).optional(),
  expectedVersion: z.number().int().nonnegative(),
});
export type TriageReviewInput = z.infer<typeof triageReviewSchema>;
