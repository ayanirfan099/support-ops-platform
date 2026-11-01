-- SupportOps M3: bounded text knowledge, line-provenance citations, and human-reviewed triage.
-- Keep in sync with packages/database/prisma/schema.prisma.
CREATE TYPE "TicketQueue" AS ENUM ('billing', 'account', 'technical', 'sales');
CREATE TYPE "TriageReviewStatus" AS ENUM ('pending', 'accepted', 'overridden');
ALTER TYPE "TicketActivityType" ADD VALUE 'triage_suggested';
ALTER TYPE "TicketActivityType" ADD VALUE 'triage_reviewed';
ALTER TYPE "TicketActivityType" ADD VALUE 'knowledge_searched';

ALTER TABLE "tickets" ADD COLUMN "queue" "TicketQueue";

CREATE TABLE "knowledge_documents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_chunks" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "startLine" INTEGER NOT NULL,
  "endLine" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_searches" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "queryHash" TEXT NOT NULL,
  "rankerVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_searches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_citations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "searchId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "startLine" INTEGER NOT NULL,
  "endLine" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_citations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "classification_suggestions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "suggestedQueue" "TicketQueue",
  "scores" JSONB NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "abstained" BOOLEAN NOT NULL DEFAULT false,
  "abstentionReason" TEXT,
  "reviewStatus" "TriageReviewStatus" NOT NULL DEFAULT 'pending',
  "reviewedQueue" "TicketQueue",
  "reviewReason" TEXT,
  "reviewerUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "classification_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_documents_id_organizationId_key" ON "knowledge_documents"("id", "organizationId");
CREATE INDEX "knowledge_documents_organizationId_updatedAt_idx" ON "knowledge_documents"("organizationId", "updatedAt");
CREATE INDEX "knowledge_documents_organizationId_title_idx" ON "knowledge_documents"("organizationId", "title");
CREATE UNIQUE INDEX "knowledge_chunks_id_organizationId_key" ON "knowledge_chunks"("id", "organizationId");
CREATE UNIQUE INDEX "knowledge_chunks_documentId_ordinal_key" ON "knowledge_chunks"("documentId", "ordinal");
CREATE INDEX "knowledge_chunks_organizationId_documentId_idx" ON "knowledge_chunks"("organizationId", "documentId");
CREATE UNIQUE INDEX "knowledge_searches_id_organizationId_key" ON "knowledge_searches"("id", "organizationId");
CREATE INDEX "knowledge_searches_organizationId_ticketId_createdAt_idx" ON "knowledge_searches"("organizationId", "ticketId", "createdAt");
CREATE UNIQUE INDEX "knowledge_citations_searchId_rank_key" ON "knowledge_citations"("searchId", "rank");
CREATE INDEX "knowledge_citations_organizationId_chunkId_idx" ON "knowledge_citations"("organizationId", "chunkId");
CREATE UNIQUE INDEX "classification_suggestions_id_organizationId_key" ON "classification_suggestions"("id", "organizationId");
CREATE INDEX "classification_suggestions_organizationId_ticketId_createdAt_idx" ON "classification_suggestions"("organizationId", "ticketId", "createdAt");
CREATE INDEX "classification_suggestions_organizationId_reviewStatus_createdAt_idx" ON "classification_suggestions"("organizationId", "reviewStatus", "createdAt");

ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_documentId_organizationId_fkey"
  FOREIGN KEY ("documentId", "organizationId") REFERENCES "knowledge_documents"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_searches" ADD CONSTRAINT "knowledge_searches_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_searches" ADD CONSTRAINT "knowledge_searches_ticketId_organizationId_fkey"
  FOREIGN KEY ("ticketId", "organizationId") REFERENCES "tickets"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_searches" ADD CONSTRAINT "knowledge_searches_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge_citations" ADD CONSTRAINT "knowledge_citations_searchId_organizationId_fkey"
  FOREIGN KEY ("searchId", "organizationId") REFERENCES "knowledge_searches"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_citations" ADD CONSTRAINT "knowledge_citations_chunkId_organizationId_fkey"
  FOREIGN KEY ("chunkId", "organizationId") REFERENCES "knowledge_chunks"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "classification_suggestions" ADD CONSTRAINT "classification_suggestions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "classification_suggestions" ADD CONSTRAINT "classification_suggestions_ticketId_organizationId_fkey"
  FOREIGN KEY ("ticketId", "organizationId") REFERENCES "tickets"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "classification_suggestions" ADD CONSTRAINT "classification_suggestions_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
