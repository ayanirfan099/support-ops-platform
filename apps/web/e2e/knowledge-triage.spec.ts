import { expect, test } from "@playwright/test";

test("agent searches line-cited knowledge and reviews an advisory triage suggestion", async ({
  page,
}) => {
  const suffix = Date.now().toString();
  const subject = `E2E: duplicate billing invoice ${suffix}`;
  const guideTitle = `E2E fictional billing guide ${suffix}`;

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
  await page.getByRole("link", { name: "Open ticket queue" }).click();
  await page.getByRole("link", { name: "Create ticket" }).click();
  await page.getByLabel("Subject").fill(subject);
  await page
    .getByLabel("Description")
    .fill(
      "My invoice shows a duplicate subscription charge and I need a refund.",
    );
  await page.getByLabel("Customer name").fill("Avery Example");
  await page
    .getByLabel("Customer email")
    .fill(`avery-e2e-${suffix}@example.invalid`);
  await page.getByRole("button", { name: "Create ticket" }).click();
  await expect(page.getByRole("heading", { name: subject })).toBeVisible();

  await page.getByRole("link", { name: "Knowledge" }).click();
  await page.getByRole("link", { name: "Add text source" }).click();
  await page.getByLabel("Document title").fill(guideTitle);
  await page
    .getByLabel("Source text")
    .fill(
      "\nFor a duplicate invoice charge, verify the receipt and request a billing review.\nRefunds are reviewed by the billing team.",
    );
  await page.getByRole("button", { name: "Save text document" }).click();
  await expect(
    page.getByRole("heading", { name: "Knowledge sources" }),
  ).toBeVisible();
  await expect(page.getByText(guideTitle)).toBeVisible();

  await page.getByRole("link", { name: /Tickets/ }).click();
  await page.getByRole("link", { name: subject }).click();
  await page
    .getByLabel("Search knowledge")
    .fill("duplicate invoice charge refund");
  await page.getByRole("button", { name: "Search" }).click();
  const citation = page.locator(".citation-card");
  await expect(citation).toContainText(guideTitle);
  await expect(citation).toContainText("Lines 2–3");
  await expect(citation).toContainText(
    "Refunds are reviewed by the billing team.",
  );

  await page.getByRole("button", { name: "Get suggestion" }).click();
  const suggestion = page.locator(".triage-suggestion").first();
  await expect(suggestion).toContainText("Suggested: billing");
  await suggestion.getByLabel("Human-selected queue").selectOption("billing");
  await suggestion
    .getByLabel("Review reason optional")
    .fill("Verified by agent in the fictional guide.");
  await suggestion.getByRole("button", { name: "Save human decision" }).click();
  await expect(suggestion).toContainText("Human accepted: billing");
  await expect(page.locator(".ticket-facts")).toContainText("billing");

  await page.getByRole("link", { name: "Knowledge" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete source" }).click();
  await expect(page.getByText(guideTitle)).toHaveCount(0);
});
