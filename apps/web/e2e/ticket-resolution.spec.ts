import { expect, test } from "@playwright/test";

test("owner and agent work a ticket, review its audit, and receive notifications", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page
    .getByLabel("Email address")
    .fill("demo@supportops.example.invalid");
  await page.getByLabel("Password").fill("SupportOps-Demo-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("heading", { name: "Your workspaces." }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /Acme Support Demo/ }).click();
  await expect(
    page.getByRole("heading", { name: "Queue snapshot" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open ticket queue" }).click();
  await expect(
    page.getByRole("heading", { name: "Support queue" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Create ticket" }).click();
  await page.getByLabel("Subject").fill("E2E: cannot access my account");
  await page
    .getByLabel("Description")
    .fill("I am locked out after updating my password.");
  await page.getByLabel("Customer name").fill("Taylor Example");
  await page.getByLabel("Customer email").fill("taylor@example.invalid");
  await page.getByRole("button", { name: "Create ticket" }).click();

  await expect(
    page.getByRole("heading", { name: "E2E: cannot access my account" }),
  ).toBeVisible();
  await expect(
    page.getByText("I am locked out after updating my password.").first(),
  ).toBeVisible();

  await page
    .getByRole("region", { name: "Set priority" })
    .getByRole("combobox")
    .selectOption("urgent");
  await page.getByRole("button", { name: "Save priority" }).click();
  await expect(page.locator(".priority-label")).toHaveText("urgent");
  await expect(
    page.getByText("Priority changed from normal to urgent"),
  ).toBeVisible();

  await page
    .getByRole("region", { name: "Assign to an agent" })
    .getByRole("combobox")
    .selectOption({ label: "Jordan Lee" });
  await page.getByRole("button", { name: "Assign" }).click();
  await expect(page.locator(".ticket-facts dd").nth(1)).toHaveText(
    "Jordan Lee",
  );

  await page.getByLabel("Add a tag").fill("account-access");
  await page.getByRole("button", { name: "Add tag" }).click();
  await expect(page.locator(".ticket-heading-badges")).toBeVisible();
  await expect(
    page.locator(".tag-management").getByText("account-access"),
  ).toBeVisible();

  await page
    .getByLabel("Public reply")
    .fill(
      "I have reset the access link. Please try again, @agent@supportops.example.invalid.",
    );
  await page.getByRole("button", { name: "Add public reply" }).click();
  await expect(
    page.getByText(
      "I have reset the access link. Please try again, a teammate.",
    ),
  ).toBeVisible();

  await page
    .getByLabel("Note for your team")
    .fill("Customer confirmed identity; request access-log review.");
  await page.getByRole("button", { name: "Save internal note" }).click();
  await expect(
    page.getByText("Customer confirmed identity; request access-log review."),
  ).toBeVisible();
  await expect(page.getByText("Internal only · not sent")).toBeVisible();

  await page.getByLabel("Status").selectOption("resolved");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.locator(".status-pill")).toHaveText("resolved");
  await expect(
    page.getByText("Status changed from new to resolved"),
  ).toBeVisible();

  await page.getByRole("link", { name: "Activity log" }).click();
  await expect(
    page.getByRole("heading", { name: "Activity log" }),
  ).toBeVisible();
  await expect(page.getByText("Ticket status changed").first()).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page
    .getByLabel("Email address")
    .fill("agent@supportops.example.invalid");
  await page.getByLabel("Password").fill("SupportOps-Agent-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Your workspaces." }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: /Acme Support Demo/ }).click();
  await expect(page.getByRole("link", { name: "Activity log" })).toHaveCount(0);
  const auditApiStatus = await page.evaluate(async () => {
    const organizationId = window.location.pathname.split("/")[2];
    const response = await fetch(
      `/api/audit?organizationId=${encodeURIComponent(organizationId ?? "")}`,
    );
    return response.status;
  });
  expect(auditApiStatus).toBe(403);
  await page.getByRole("link", { name: "Notifications", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Notifications" }),
  ).toBeVisible();
  await expect(page.getByText("A ticket was assigned to you.")).toBeVisible();
  await expect(
    page.getByText("You were mentioned in a customer-visible reply."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark read" }).first().click();
  await expect(page.getByText("Read").first()).toBeVisible();
});
