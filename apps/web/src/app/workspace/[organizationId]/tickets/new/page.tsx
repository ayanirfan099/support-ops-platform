import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { MembershipRequiredError } from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceNav } from "@/components/workspace-nav";
import { TicketCreateForm } from "@/components/ticket-create-form";
import { auth } from "@/lib/auth";
import { requireWorkspaceMembership } from "@/lib/authorization";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create ticket · SupportOps" };

export default async function NewTicketPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const { organizationId } = await params;
  let membership;
  try {
    membership = await requireWorkspaceMembership(organizationId);
  } catch (error) {
    if (error instanceof MembershipRequiredError) notFound();
    throw error;
  }
  const organization = await db.organization.findUnique({
    where: { id: membership.organizationId },
    select: { name: true },
  });
  if (!organization) notFound();

  return (
    <div className="app-frame">
      <aside className="rail">
        <Brand />
        <WorkspaceNav
          organizationId={organizationId}
          role={membership.role}
          active="tickets"
        />
        <div className="rail-foot">New support request · {membership.role}</div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">{organization.name} / New ticket</span>
          <SignOutButton />
        </header>
        <main className="main-content form-page">
          <Link
            className="back-link"
            href={`/workspace/${organizationId}/tickets`}
          >
            ← Back to queue
          </Link>
          <p className="kicker">Create a record</p>
          <h1>New ticket</h1>
          <p className="lede">
            Ticket creation is saved to this workspace. Customer messages and
            internal notes stay separate.
          </p>
          <TicketCreateForm organizationId={organizationId} />
        </main>
      </div>
    </div>
  );
}
