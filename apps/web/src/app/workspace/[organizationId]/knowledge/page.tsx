import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { MembershipRequiredError } from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { KnowledgeDeleteButton } from "@/components/knowledge-delete-button";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceNav } from "@/components/workspace-nav";
import { auth } from "@/lib/auth";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { listKnowledgeDocuments } from "@/lib/knowledge-triage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Knowledge · SupportOps" };

export default async function KnowledgePage({
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
  const documents = await listKnowledgeDocuments(organizationId);

  return (
    <div className="app-frame">
      <aside className="rail">
        <Brand />
        <WorkspaceNav
          organizationId={organizationId}
          role={membership.role}
          active="knowledge"
        />
        <div className="rail-foot">
          <strong>Workspace-scoped sources</strong>
          <br />
          Text excerpts keep their original line references.
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">{organization.name} / Knowledge</span>
          <SignOutButton />
        </header>
        <main className="main-content">
          <div className="page-heading-row">
            <div>
              <p className="kicker">Evidence library</p>
              <h1>Knowledge sources</h1>
              <p className="lede">
                Add bounded plain-text guides. Search returns line-numbered
                excerpts, not generated answers.
              </p>
            </div>
            <Link
              className="button"
              href={`/workspace/${organizationId}/knowledge/new`}
            >
              Add text source
            </Link>
          </div>
          <section className="knowledge-list" aria-label="Knowledge documents">
            {documents.length === 0 ? (
              <div className="panel empty-state">
                <span className="empty-mark" aria-hidden="true">
                  ⌕
                </span>
                <h2>No sources in this workspace yet.</h2>
                <p>
                  Add a fictional plain-text support guide to try lexical
                  evidence search.
                </p>
                <Link
                  className="button"
                  href={`/workspace/${organizationId}/knowledge/new`}
                >
                  Add the first source
                </Link>
              </div>
            ) : (
              documents.map((document) => (
                <article
                  className="panel knowledge-document-card"
                  key={document.id}
                >
                  <div>
                    <p className="kicker">
                      Text source · {document._count.chunks} excerpts
                    </p>
                    <h2>{document.title}</h2>
                    <p className="muted-small">
                      Updated{" "}
                      <time dateTime={document.updatedAt.toISOString()}>
                        {document.updatedAt.toLocaleString()}
                      </time>
                    </p>
                  </div>
                  <div className="knowledge-document-actions">
                    <span className="document-id">
                      #{document.id.slice(-6).toUpperCase()}
                    </span>
                    <KnowledgeDeleteButton
                      organizationId={organizationId}
                      documentId={document.id}
                      title={document.title}
                    />
                  </div>
                </article>
              ))
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
