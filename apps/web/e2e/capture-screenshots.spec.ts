import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const screenshotDirectory = path.resolve("docs/screenshots");

test.describe("portfolio screenshot capture", () => {
  test.skip(
    process.env.CAPTURE_PORTFOLIO_SCREENSHOTS !== "1",
    "Set CAPTURE_PORTFOLIO_SCREENSHOTS=1 to refresh committed screenshots.",
  );

  test("captures seeded dashboard, evidence search, and reviewed triage", async ({
    page,
  }) => {
    await mkdir(screenshotDirectory, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });

    const ownerEmail =
      process.env.DEMO_ACCOUNT_EMAIL ?? "demo@supportops.example.invalid";
    const ownerPassword =
      process.env.DEMO_ACCOUNT_PASSWORD ?? "SupportOps-Demo-2026!";
    const subject = "Duplicate billing charge needs review";
    const guideTitle = "Fictional billing review playbook";

    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(ownerEmail);
    await page.getByLabel("Password").fill(ownerPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("heading", { name: "Your workspaces." }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Acme Support Demo/ }).click();
    await expect(
      page.getByRole("heading", { name: "Queue snapshot" }),
    ).toBeVisible();
    const dashboardUrl = page.url();

    await page.getByRole("link", { name: "Open ticket queue" }).click();
    await page.getByRole("link", { name: "Create ticket" }).click();
    await page.getByLabel("Subject").fill(subject);
    await page
      .getByLabel("Description")
      .fill(
        "The latest invoice contains a duplicate subscription charge. Please verify the receipt and request a billing review.",
      );
    await page.getByLabel("Customer name").fill("Avery Example");
    await page
      .getByLabel("Customer email")
      .fill("avery.portfolio@example.invalid");
    await page.getByRole("button", { name: "Create ticket" }).click();
    await expect(page.getByRole("heading", { name: subject })).toBeVisible();
    const ticketUrl = page.url();

    await page.getByRole("link", { name: "Knowledge" }).click();
    await page.getByRole("link", { name: "Add text source" }).click();
    await page.getByLabel("Document title").fill(guideTitle);
    await page
      .getByLabel("Source text")
      .fill(
        "Billing review procedure\nVerify the receipt and confirm whether the invoice contains a duplicate subscription charge.\nSend duplicate-charge cases to the billing queue for human review.\nRefund eligibility must be confirmed by a support agent.",
      );
    await page.getByRole("button", { name: "Save text document" }).click();
    await expect(page.getByText(guideTitle)).toBeVisible();

    await page.goto(ticketUrl);
    await page
      .getByLabel("Search knowledge")
      .fill("duplicate subscription charge billing review");
    await page.getByRole("button", { name: "Search" }).click();

    const evidencePanel = page.locator(".evidence-panel");
    await expect(evidencePanel.locator(".citation-card").first()).toContainText(
      guideTitle,
    );
    await evidencePanel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(screenshotDirectory, "knowledge-search.png"),
      animations: "disabled",
      caret: "hide",
    });

    await page.getByRole("button", { name: "Get suggestion" }).click();
    const suggestion = page.locator(".triage-suggestion").first();
    await expect(suggestion).toContainText("Suggested: billing");
    await suggestion.getByLabel("Human-selected queue").selectOption("billing");
    await suggestion
      .getByLabel("Review reason optional")
      .fill("Verified against the fictional billing playbook.");
    await suggestion
      .getByRole("button", { name: "Save human decision" })
      .click();
    await expect(suggestion).toContainText("Human accepted: billing");

    const triagePanel = page.locator(".triage-panel");
    await triagePanel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(screenshotDirectory, "ticket-triage.png"),
      animations: "disabled",
      caret: "hide",
    });

    await page.goto(dashboardUrl);
    await expect(
      page.getByRole("heading", { name: "Queue snapshot" }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDirectory, "dashboard.png"),
      animations: "disabled",
      caret: "hide",
    });
  });
});
