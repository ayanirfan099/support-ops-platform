import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { MembershipRequiredError } from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { KnowledgeCreateForm } from "@/components/knowledge-create-form";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceNav } from "@/components/workspace-nav";
import { auth } from "@/lib/auth";
import { requireWorkspaceMembership } from "@/lib/authorization";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Add knowledge source · SupportOps",
};

export default async function NewKnowledgeDocumentPage({
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
          active="knowledge"
        />
        <div className="rail-foot">Plain-text source · {membership.role}</div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">{organization.name} / Add source</span>
          <SignOutButton />
        </header>
        <main className="main-content form-page">
          <Link
            className="back-link"
            href={`/workspace/${organizationId}/knowledge`}
          >
            ← Back to sources
          </Link>
          <p className="kicker">Evidence library</p>
          <h1>Add a text source</h1>
          <p className="lede">
            Sources are private to this workspace. PDFs, uploads, OCR, and
            generated answers are not enabled.
          </p>
          <KnowledgeCreateForm organizationId={organizationId} />
        </main>
      </div>
    </div>
  );
}
