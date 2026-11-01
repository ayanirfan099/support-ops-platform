import { describe, expect, it } from "vitest";
import { toCustomerTicketView } from "./customer-ticket-view";

describe("customer ticket projection", () => {
  it("allowlists public fields and never exposes internal notes", () => {
    const projected = toCustomerTicketView({
      id: "ticket-1",
      subject: "A billing question",
      status: "open",
      messages: [
        {
          id: "message-1",
          body: "We are looking into this.",
          createdAt: new Date("2026-11-01T12:00:00.000Z"),
        },
      ],
      internalNotes: [{ body: "Escalate to finance." }],
      organizationId: "org-secret",
    } as Parameters<typeof toCustomerTicketView>[0]);

    expect(projected).toEqual({
      id: "ticket-1",
      subject: "A billing question",
      status: "open",
      messages: [
        {
          id: "message-1",
          body: "We are looking into this.",
          createdAt: new Date("2026-11-01T12:00:00.000Z"),
        },
      ],
    });
    expect(projected).not.toHaveProperty("internalNotes");
    expect(projected).not.toHaveProperty("organizationId");
  });
});
