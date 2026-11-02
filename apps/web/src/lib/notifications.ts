import type { Prisma } from "@prisma/client";

export type MentionContext = "customer-visible reply" | "internal note";

const mentionPattern = /@([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;

export function extractMentionEmails(text: string): string[] {
  const matches = text.matchAll(mentionPattern);
  return [...new Set([...matches].map((match) => match[1]!.toLowerCase()))];
}

/** Do not expose a workspace member's email address in a customer-visible reply. */
export function removeMentionHandlesFromCustomerReply(
  text: string,
  mentionedEmails: string[],
): string {
  const notifiedEmails = new Set(mentionedEmails);
  return text
    .replace(mentionPattern, (handle, email: string) =>
      notifiedEmails.has(email.toLowerCase()) ? "a teammate" : handle,
    )
    .replace(/ {2,}/g, " ");
}

export async function notifyAssignedMember(
  transaction: Prisma.TransactionClient,
  input: {
    organizationId: string;
    recipientMembershipId: string;
    recipientUserId: string;
    actorUserId: string;
    ticketId: string;
  },
) {
  if (input.recipientUserId === input.actorUserId) return;
  await transaction.notification.create({
    data: {
      organizationId: input.organizationId,
      recipientMembershipId: input.recipientMembershipId,
      actorUserId: input.actorUserId,
      ticketId: input.ticketId,
      type: "assignment",
      summary: "A ticket was assigned to you.",
    },
  });
}

export async function notifyMentionedMembers(
  transaction: Prisma.TransactionClient,
  input: {
    organizationId: string;
    ticketId: string;
    actorUserId: string;
    body: string;
    context: MentionContext;
  },
): Promise<string[]> {
  const emails = extractMentionEmails(input.body);
  if (emails.length === 0) return [];

  const recipients = await transaction.membership.findMany({
    where: {
      organizationId: input.organizationId,
      user: { is: { email: { in: emails, mode: "insensitive" } } },
    },
    select: { id: true, userId: true, user: { select: { email: true } } },
  });
  if (recipients.length === 0) return [];

  const recipientsToNotify = recipients.filter(
    ({ userId }) => userId !== input.actorUserId,
  );
  if (recipientsToNotify.length) {
    const noun =
      input.context === "internal note"
        ? "a team note"
        : "a customer-visible reply";
    await transaction.notification.createMany({
      data: recipientsToNotify.map((recipient) => ({
        organizationId: input.organizationId,
        recipientMembershipId: recipient.id,
        actorUserId: input.actorUserId,
        ticketId: input.ticketId,
        type: "mention" as const,
        summary: `You were mentioned in ${noun}.`,
      })),
    });
  }
  return recipients.map(({ user }) => user.email.toLowerCase());
}
