import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const { db } = await import("@supportops/database");
const { auth } = await import("../src/lib/auth");

const email = process.env.DEMO_ACCOUNT_EMAIL ?? "demo@supportops.local";
const password = process.env.DEMO_ACCOUNT_PASSWORD ?? "SupportOps-Demo-2026!";
const organizationName = "Acme Support Demo";
const organizationSlug = "acme-support-demo";

async function main() {
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    try {
      await auth.api.signUpEmail({
        body: { name: "Alex Morgan", email, password },
      });
    } catch {
      throw new Error(
        "Seed account could not be created; check database and auth configuration.",
      );
    }
    user = await db.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(
        "Seed account could not be created; no account was returned.",
      );
    }
  }

  const organization = await db.organization.upsert({
    where: { slug: organizationSlug },
    update: { name: organizationName },
    create: { name: organizationName, slug: organizationSlug },
  });

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
    console.error("Seed failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unexpected seed error",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
