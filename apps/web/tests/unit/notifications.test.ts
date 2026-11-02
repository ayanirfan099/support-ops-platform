import { describe, expect, it } from "vitest";
import {
  extractMentionEmails,
  removeMentionHandlesFromCustomerReply,
} from "../../src/lib/notifications";

describe("in-app mention handling", () => {
  it("extracts unique emails case-insensitively", () => {
    expect(
      extractMentionEmails(
        "Ping @Agent@example.invalid, then @agent@example.invalid and @bad.",
      ),
    ).toEqual(["agent@example.invalid"]);
  });

  it("does not publish mention email handles in a customer-visible reply", () => {
    expect(
      removeMentionHandlesFromCustomerReply(
        "Hi @agent@example.invalid, can you review this?",
        ["agent@example.invalid"],
      ),
    ).toBe("Hi a teammate, can you review this?");
    expect(
      removeMentionHandlesFromCustomerReply(
        "Contact @outside@example.invalid.",
        [],
      ),
    ).toBe("Contact @outside@example.invalid.");
  });
});
