interface CustomerTicketViewInput {
  id: string;
  subject: string;
  status: string;
  messages: Array<{ id: string; body: string; createdAt: Date }>;
}

/** Keep the customer-facing shape allowlisted; internal notes and staff metadata do not pass through. */
export function toCustomerTicketView(ticket: CustomerTicketViewInput) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    messages: ticket.messages,
  };
}
