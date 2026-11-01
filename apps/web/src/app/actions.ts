"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { organizationCreateSchema } from "@supportops/contracts";
import { db } from "@supportops/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function createOrganization(formData: FormData): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const parsed = organizationCreateSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    redirect("/workspace?error=invalid-name");
  }

  let organizationId: string;
  try {
    const organization = await db.$transaction(async (transaction) => {
      const created = await transaction.organization.create({
        data: {
          name: parsed.data.name,
          slug: `${
            parsed.data.name
              .toLowerCase()
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 48) || "workspace"
          }-${randomUUID().slice(0, 8)}`,
        },
      });
      await transaction.membership.create({
        data: {
          organizationId: created.id,
          userId: session.user.id,
          role: "owner",
        },
      });
      return created;
    });
    organizationId = organization.id;
  } catch (error) {
    console.error("workspace.create failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    redirect("/workspace?error=create-failed");
  }

  revalidatePath("/workspace");
  redirect(`/workspace/${organizationId}`);
}
