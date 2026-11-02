import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  MembershipRequiredError,
  OWNER_MANAGER,
  RoleRequiredError,
} from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceNav } from "@/components/workspace-nav";
import { auth } from "@/lib/auth";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { listAuditEvents } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activity log · SupportOps" };

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const { organizationId } = await params;
  let membership;
  try {
    membership = await requireWorkspaceMembership(
      organizationId,
      OWNER_MANAGER,
    );
  } catch (error) {
    if (
      error instanceof MembershipRequiredError ||
      error instanceof RoleRequiredError
    ) {
      notFound();
    }
    throw error;
  }
  const organization = await db.organization.findUnique({
    where: { id: membership.organizationId },
    select: { name: true },
  });
  if (!organization) notFound();
  const query = await searchParams;
  const result = await listAuditEvents(
    membership.organizationId,
    query.cursor?.slice(0, 100),
  );

  return (
    <div className="app-frame">
      <aside className="rail">
        <Brand />
        <WorkspaceNav
          organizationId={organizationId}
          role={membership.role}
          active="audit"
        />
        <div className="rail-foot">
          <strong>Restricted activity</strong>
          <br />
          Visible to workspace owners and managers.
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">
            {organization.name} / Activity log
          </span>
          <SignOutButton />
        </header>
        <main className="main-content">
          <p className="kicker">Workspace governance</p>
          <h1>Activity log</h1>
          <p className="lede">
            A tenant-scoped record of ticket and knowledge operations. Message
            bodies and customer content are not included.
          </p>
          <section className="panel" aria-labelledby="audit-events-title">
            <h2 className="panel-title" id="audit-events-title">
              Recent activity
            </h2>
            {result.items.length ? (
              <ol className="audit-list">
                {result.items.map((event) => (
                  <li key={event.id}>
                    <div className="audit-event-heading">
                      <strong>{event.summary}</strong>
                      <time dateTime={event.createdAt.toISOString()}>
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "UTC",
                        }).format(event.createdAt)}{" "}
                        UTC
                      </time>
                    </div>
                    <p>
                      {event.actor?.name ?? "Former or unavailable member"}
                      {" · "}
                      {event.action}
                    </p>
                    <p className="audit-target">
                      {event.targetType} · {event.targetId}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">No audit events are recorded yet.</p>
            )}
            {result.nextCursor ? (
              <div className="pagination-row">
                <Link
                  className="button secondary"
                  href={`/workspace/${organizationId}/audit?cursor=${encodeURIComponent(result.nextCursor)}`}
                >
                  Older activity
                </Link>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
