import { z } from "zod";

export const ticketStatusSchema = z.enum([
  "new",
  "open",
  "pending",
  "resolved",
  "closed",
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const ticketCreateSchema = z.object({
  organizationId: z.string().min(1).max(100),
  subject: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(10_000),
  priority: ticketPrioritySchema.default("normal"),
  slaTargetAt: z.string().datetime().optional(),
  customer: z.object({
    name: z.string().trim().min(1).max(100),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((email) => email.toLowerCase()),
  }),
});
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;

export const ticketListFiltersSchema = z.object({
  organizationId: z.string().min(1).max(100),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  query: z.string().trim().max(200).optional(),
  assigneeMembershipId: z.string().min(1).max(100).optional(),
  tag: z.string().trim().min(1).max(32).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type TicketListFilters = z.infer<typeof ticketListFiltersSchema>;

export const transitionTicketSchema = z.object({
  organizationId: z.string().min(1).max(100),
  status: ticketStatusSchema,
  expectedVersion: z.number().int().nonnegative(),
});

export const priorityChangeSchema = z.object({
  organizationId: z.string().min(1).max(100),
  priority: ticketPrioritySchema,
  expectedVersion: z.number().int().nonnegative(),
});

export const assignmentSchema = z.object({
  organizationId: z.string().min(1).max(100),
  membershipId: z.string().min(1).max(100),
  expectedVersion: z.number().int().nonnegative(),
});

export const ticketReplySchema = z.object({
  organizationId: z.string().min(1).max(100),
  body: z.string().trim().min(1).max(10_000),
});

export const internalNoteSchema = z.object({
  organizationId: z.string().min(1).max(100),
  body: z.string().trim().min(1).max(10_000),
});

export const ticketTagSchema = z.object({
  organizationId: z.string().min(1).max(100),
  name: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((name) => name.toLowerCase()),
});

const validTicketTransitions: Record<TicketStatus, readonly TicketStatus[]> = {
  new: ["open", "pending", "resolved", "closed"],
  open: ["pending", "resolved", "closed"],
  pending: ["open", "resolved", "closed"],
  resolved: ["open", "closed"],
  closed: ["open"],
};

export function canTransitionTicket(
  current: TicketStatus,
  next: TicketStatus,
): boolean {
  return validTicketTransitions[current].includes(next);
}

export type SlaState = "none" | "on_track" | "at_risk" | "overdue" | "met";

export function calculateSlaState(
  slaTargetAt: Date | null,
  now: Date = new Date(),
  completedAt: Date | null = null,
  riskWindowMs = 4 * 60 * 60 * 1000,
): SlaState {
  if (!slaTargetAt) return "none";
  if (completedAt) {
    return completedAt.getTime() <= slaTargetAt.getTime() ? "met" : "overdue";
  }
  const remainingMs = slaTargetAt.getTime() - now.getTime();
  if (remainingMs <= 0) return "overdue";
  if (remainingMs <= riskWindowMs) return "at_risk";
  return "on_track";
}
