-- SupportOps M4: tenant-scoped operational metrics, in-app notifications, and restricted audit history.
-- Keep in sync with packages/database/prisma/schema.prisma.
CREATE TYPE "NotificationType" AS ENUM ('assignment', 'mention');

-- Composite access paths for the bounded dashboard aggregates.
CREATE INDEX "tickets_organizationId_status_slaTargetAt_idx"
  ON "tickets"("organizationId", "status", "slaTargetAt");
CREATE INDEX "knowledge_searches_organizationId_createdAt_idx"
  ON "knowledge_searches"("organizationId", "createdAt");
CREATE INDEX "classification_suggestions_organizationId_reviewStatus_reviewedAt_idx"
  ON "classification_suggestions"("organizationId", "reviewStatus", "reviewedAt");
CREATE INDEX "assignments_organizationId_endedAt_assignedAt_idx"
  ON "assignments"("organizationId", "endedAt", "assignedAt");

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "recipientMembershipId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "ticketId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "summary" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_organizationId_recipientMembershipId_readAt_createdAt_idx"
  ON "notifications"("organizationId", "recipientMembershipId", "readAt", "createdAt");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientMembershipId_organizationId_fkey"
  FOREIGN KEY ("recipientMembershipId", "organizationId") REFERENCES "memberships"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ticketId_organizationId_fkey"
  FOREIGN KEY ("ticketId", "organizationId") REFERENCES "tickets"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_organizationId_createdAt_id_idx"
  ON "audit_events"("organizationId", "createdAt", "id");
CREATE INDEX "audit_events_organizationId_targetType_targetId_idx"
  ON "audit_events"("organizationId", "targetType", "targetId");

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
