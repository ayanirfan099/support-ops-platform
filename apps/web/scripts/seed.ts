import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const { db } = await import("@supportops/database");
const { auth } = await import("../src/lib/auth");

const email =
  process.env.DEMO_ACCOUNT_EMAIL ?? "demo@supportops.example.invalid";
const password = process.env.DEMO_ACCOUNT_PASSWORD ?? "SupportOps-Demo-2026!";
const organizationName = "Acme Support Demo";
const organizationSlug = "acme-support-demo";

let stage = "find-seed-user";

async function main() {
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    stage = "create-seed-user";
    const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          origin: baseURL,
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "Alex Morgan", email, password }),
      }),
    );
    if (!response.ok) {
      throw new Error(
        `Seed account could not be created (HTTP ${response.status}).`,
      );
    }
    stage = "verify-seed-user";
    user = await db.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(
        "Seed account could not be created; no account was returned.",
      );
    }
  }

  stage = "upsert-demo-organization";
  const organization = await db.organization.upsert({
    where: { slug: organizationSlug },
    update: { name: organizationName },
    create: { name: organizationName, slug: organizationSlug },
  });

  stage = "upsert-owner-membership";
  await db.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: { role: "owner" },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: "owner",
    },
  });

  console.info("Fictional SupportOps seed account and workspace are ready.");
  console.info(`Email: ${email}`);
  console.info(
    "Password: use DEMO_ACCOUNT_PASSWORD (local demo default if unset)",
  );
}

main()
  .catch((error: unknown) => {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    console.error("Seed failed", { stage, errorType });
    if (process.env.GITHUB_ACTIONS === "true") {
      console.error(
        `::error title=Demo seed failure::Stage ${stage} failed (${errorType}).`,
      );
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
