import { describe, expect, it } from "vitest";
import {
  calculateSlaState,
  canTransitionTicket,
  priorityChangeSchema,
  ticketCreateSchema,
  ticketListFiltersSchema,
} from "./tickets";

const baseTime = new Date("2026-11-01T12:00:00.000Z");

describe("ticket transitions", () => {
  it("allows documented transitions and rejects no-op/invalid transitions", () => {
    expect(canTransitionTicket("new", "open")).toBe(true);
    expect(canTransitionTicket("open", "resolved")).toBe(true);
    expect(canTransitionTicket("closed", "open")).toBe(true);
    expect(canTransitionTicket("new", "new")).toBe(false);
    expect(canTransitionTicket("closed", "resolved")).toBe(false);
  });
});

describe("SLA state", () => {
  it("distinguishes absent, on-track, at-risk, overdue, and completed targets", () => {
    expect(calculateSlaState(null, baseTime)).toBe("none");
    expect(
      calculateSlaState(new Date("2026-11-01T18:00:00.000Z"), baseTime),
    ).toBe("on_track");
    expect(
      calculateSlaState(new Date("2026-11-01T16:00:00.000Z"), baseTime),
    ).toBe("at_risk");
    expect(
      calculateSlaState(new Date("2026-11-01T11:59:59.999Z"), baseTime),
    ).toBe("overdue");
    expect(
      calculateSlaState(
        new Date("2026-11-01T13:00:00.000Z"),
        baseTime,
        new Date("2026-11-01T12:30:00.000Z"),
      ),
    ).toBe("met");
    expect(
      calculateSlaState(
        new Date("2026-11-01T13:00:00.000Z"),
        baseTime,
        new Date("2026-11-01T13:30:00.000Z"),
      ),
    ).toBe("overdue");
  });
});

describe("ticket boundary schemas", () => {
  it("normalizes customer email and validates ticket fields", () => {
    const parsed = ticketCreateSchema.parse({
      organizationId: "org-1",
      subject: "  Invoice is missing  ",
      description: "  I cannot find the latest invoice in my account.  ",
      customer: { name: "Sam Example", email: "SAM@EXAMPLE.INVALID" },
    });
    expect(parsed.subject).toBe("Invoice is missing");
    expect(parsed.customer.email).toBe("sam@example.invalid");
    expect(parsed.priority).toBe("normal");
  });

  it("validates versioned priority changes", () => {
    expect(
      priorityChangeSchema.parse({
        organizationId: "org-1",
        priority: "urgent",
        expectedVersion: 4,
      }),
    ).toEqual({
      organizationId: "org-1",
      priority: "urgent",
      expectedVersion: 4,
    });
    expect(
      priorityChangeSchema.safeParse({
        organizationId: "org-1",
        priority: "critical",
        expectedVersion: -1,
      }).success,
    ).toBe(false);
  });

  it("bounds filters and pagination", () => {
    expect(
      ticketListFiltersSchema.parse({ organizationId: "org-1", page: "3" })
        .page,
    ).toBe(3);
    expect(
      ticketListFiltersSchema.safeParse({
        organizationId: "org-1",
        pageSize: "1000",
      }).success,
    ).toBe(false);
    expect(
      ticketCreateSchema.safeParse({
        organizationId: "org-1",
        subject: "x",
        description: "text",
        customer: { name: "Customer", email: "not-an-email" },
      }).success,
    ).toBe(false);
  });
});
