-- SupportOps M2: tenant-scoped ticketing, messages, private notes, assignment, tags, and audit activity.
-- Keep in sync with packages/database/prisma/schema.prisma.
CREATE TYPE "TicketStatus" AS ENUM ('new', 'open', 'pending', 'resolved', 'closed');
CREATE TYPE "TicketPriority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "TicketActivityType" AS ENUM ('created', 'status_changed', 'priority_changed', 'assigned', 'reply_added', 'note_added', 'tag_added', 'tag_removed');

CREATE TABLE "customers" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tickets" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'new',
  "priority" "TicketPriority" NOT NULL DEFAULT 'normal',
  "slaTargetAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_messages" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "internal_notes" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignments" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_tags" (
  "organizationId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("ticketId", "tagId")
);

CREATE TABLE "ticket_activities" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" "TicketActivityType" NOT NULL,
  "summary" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "memberships_id_organizationId_key" ON "memberships"("id", "organizationId");
CREATE UNIQUE INDEX "customers_id_organizationId_key" ON "customers"("id", "organizationId");
CREATE UNIQUE INDEX "customers_organizationId_email_key" ON "customers"("organizationId", "email");
CREATE INDEX "customers_organizationId_name_idx" ON "customers"("organizationId", "name");
CREATE UNIQUE INDEX "tickets_id_organizationId_key" ON "tickets"("id", "organizationId");
CREATE INDEX "tickets_organizationId_status_updatedAt_idx" ON "tickets"("organizationId", "status", "updatedAt");
CREATE INDEX "tickets_organizationId_priority_updatedAt_idx" ON "tickets"("organizationId", "priority", "updatedAt");
CREATE INDEX "tickets_organizationId_createdAt_idx" ON "tickets"("organizationId", "createdAt");
CREATE INDEX "ticket_messages_organizationId_ticketId_createdAt_idx" ON "ticket_messages"("organizationId", "ticketId", "createdAt");
CREATE INDEX "internal_notes_organizationId_ticketId_createdAt_idx" ON "internal_notes"("organizationId", "ticketId", "createdAt");
CREATE INDEX "assignments_organizationId_ticketId_endedAt_idx" ON "assignments"("organizationId", "ticketId", "endedAt");
CREATE INDEX "assignments_organizationId_membershipId_endedAt_idx" ON "assignments"("organizationId", "membershipId", "endedAt");
CREATE UNIQUE INDEX "tags_id_organizationId_key" ON "tags"("id", "organizationId");
CREATE UNIQUE INDEX "tags_organizationId_name_key" ON "tags"("organizationId", "name");
CREATE INDEX "ticket_tags_organizationId_tagId_idx" ON "ticket_tags"("organizationId", "tagId");
CREATE INDEX "ticket_activities_organizationId_ticketId_createdAt_idx" ON "ticket_activities"("organizationId", "ticketId", "createdAt");

ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customerId_organizationId_fkey"
  FOREIGN KEY ("customerId", "organizationId") REFERENCES "customers"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_organizationId_fkey"
  FOREIGN KEY ("ticketId", "organizationId") REFERENCES "tickets"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_ticketId_organizationId_fkey"
  FOREIGN KEY ("ticketId", "organizationId") REFERENCES "tickets"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_ticketId_organizationId_fkey"
  FOREIGN KEY ("ticketId", "organizationId") REFERENCES "tickets"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_membershipId_organizationId_fkey"
  FOREIGN KEY ("membershipId", "organizationId") REFERENCES "memberships"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tags" ADD CONSTRAINT "tags_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_tags" ADD CONSTRAINT "ticket_tags_ticketId_organizationId_fkey"
  FOREIGN KEY ("ticketId", "organizationId") REFERENCES "tickets"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_tags" ADD CONSTRAINT "ticket_tags_tagId_organizationId_fkey"
  FOREIGN KEY ("tagId", "organizationId") REFERENCES "tags"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_activities" ADD CONSTRAINT "ticket_activities_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_activities" ADD CONSTRAINT "ticket_activities_ticketId_organizationId_fkey"
  FOREIGN KEY ("ticketId", "organizationId") REFERENCES "tickets"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_activities" ADD CONSTRAINT "ticket_activities_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
