import { expect, test } from "@playwright/test";

test("agent signs in, works a ticket, and resolves it", async ({ page }) => {
  await page.goto("/sign-in");
  await page
    .getByLabel("Email address")
    .fill("demo@supportops.example.invalid");
  await page.getByLabel("Password").fill("SupportOps-Demo-2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("heading", { name: "Your workspaces." }),
  ).toBeVisible();
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

  await page.getByLabel("Priority").selectOption("urgent");
  await page.getByRole("button", { name: "Save priority" }).click();
  await expect(page.locator(".priority-label")).toHaveText("urgent");
  await expect(
    page.getByText("Priority changed from normal to urgent"),
  ).toBeVisible();

  await page.getByLabel("Agent").selectOption({ label: "Jordan Lee" });
  await page.getByRole("button", { name: "Assign" }).click();
  await expect(page.getByText("Jordan Lee").first()).toBeVisible();

  await page.getByLabel("Add a tag").fill("account-access");
  await page.getByRole("button", { name: "Add tag" }).click();
  await expect(page.locator(".ticket-heading-badges")).toBeVisible();
  await expect(
    page.locator(".tag-management").getByText("account-access"),
  ).toBeVisible();

  await page
    .getByLabel("Public reply")
    .fill("I have reset the access link. Please try again.");
  await page.getByRole("button", { name: "Add public reply" }).click();
  await expect(
    page.getByText("I have reset the access link. Please try again."),
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
});
