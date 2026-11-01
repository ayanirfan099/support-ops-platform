import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const demoOwnerEmail =
  process.env.DEMO_ACCOUNT_EMAIL ?? "demo@supportops.example.invalid";
const demoOwnerPassword =
  process.env.DEMO_ACCOUNT_PASSWORD ?? "SupportOps-Demo-2026!";
const demoAgentEmail =
  process.env.DEMO_AGENT_EMAIL ?? "agent@supportops.example.invalid";
const demoAgentPassword =
  process.env.DEMO_AGENT_PASSWORD ?? "SupportOps-Agent-2026!";
const organizationName = "Acme Support Demo";
const organizationSlug = "acme-support-demo";
let stage = "load-seed-services";

async function ensureDemoUser(
  db: typeof import("@supportops/database").db,
  auth: typeof import("../src/lib/auth").auth,
  name: string,
  email: string,
  password: string,
) {
  let user = await db.user.findUnique({ where: { email } });
  if (user) return user;

  stage = `create-${name.toLowerCase().replace(/[^a-z]+/g, "-")}-user`;
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const response = await auth.handler(
    new Request(`${baseURL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { origin: baseURL, "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    }),
  );
  if (!response.ok) {
    throw new Error(
      `Seed account could not be created (HTTP ${response.status}).`,
    );
  }

  stage = `verify-${name.toLowerCase().replace(/[^a-z]+/g, "-")}-user`;
  user = await db.user.findUnique({ where: { email } });
  if (!user)
    throw new Error(
      "Seed account could not be created; no account was returned.",
    );
  return user;
}

async function main() {
  const { db } = await import("@supportops/database");
  const { auth } = await import("../src/lib/auth");

  try {
    const owner = await ensureDemoUser(
      db,
      auth,
      "Alex Morgan",
      demoOwnerEmail,
      demoOwnerPassword,
    );
    const agent = await ensureDemoUser(
      db,
      auth,
      "Jordan Lee",
      demoAgentEmail,
      demoAgentPassword,
    );

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
          userId: owner.id,
          organizationId: organization.id,
        },
      },
      update: { role: "owner" },
      create: {
        userId: owner.id,
        organizationId: organization.id,
        role: "owner",
      },
    });

    stage = "upsert-agent-membership";
    await db.membership.upsert({
      where: {
        userId_organizationId: {
          userId: agent.id,
          organizationId: organization.id,
        },
      },
      update: { role: "agent" },
      create: {
        userId: agent.id,
        organizationId: organization.id,
        role: "agent",
      },
    });

    console.info("Fictional SupportOps seed accounts and workspace are ready.");
    console.info(`Owner: ${demoOwnerEmail}`);
    console.info(`Agent: ${demoAgentEmail}`);
    console.info(
      "Passwords: use DEMO_ACCOUNT_PASSWORD and DEMO_AGENT_PASSWORD",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  console.error("Seed failed", { stage, errorType });
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log(
      `::error title=Demo seed failure::Stage ${stage} failed (${errorType}).`,
    );
  }
  process.exitCode = 1;
});
