import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MembershipRequiredError } from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { NotificationList } from "@/components/notification-list";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceNav } from "@/components/workspace-nav";
import { auth } from "@/lib/auth";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { listNotifications } from "@/lib/notification-feed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications · SupportOps" };

export default async function NotificationsPage({
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
    membership = await requireWorkspaceMembership(organizationId);
  } catch (error) {
    if (error instanceof MembershipRequiredError) notFound();
    throw error;
  }
  const organization = await db.organization.findUnique({
    where: { id: membership.organizationId },
    select: { id: true, name: true },
  });
  if (!organization) notFound();
  const query = await searchParams;
  const cursor = query.cursor?.slice(0, 100);
  const result = await listNotifications(
    membership.organizationId,
    membership.userId,
    cursor,
  );

  return (
    <div className="app-frame">
      <aside className="rail">
        <Brand />
        <WorkspaceNav
          organizationId={organizationId}
          role={membership.role}
          active="notifications"
        />
        <div className="rail-foot">
          <strong>{result.unreadCount} unread</strong>
          <br />
          Assignment and mention updates for your workspace membership.
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">
            {organization.name} / Notifications
          </span>
          <SignOutButton />
        </header>
        <main className="main-content">
          <p className="kicker">Your work</p>
          <h1>Notifications</h1>
          <p className="lede">
            Ticket assignment and mention updates. Each notification links to
            its ticket.
          </p>
          <section className="panel" aria-labelledby="notification-list-title">
            <div className="section-heading-row">
              <h2 className="panel-title" id="notification-list-title">
                Inbox{" "}
                <span className="count-chip">{result.unreadCount} unread</span>
              </h2>
            </div>
            <NotificationList
              organizationId={organizationId}
              items={result.items.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
                readAt: item.readAt?.toISOString() ?? null,
              }))}
            />
            {result.nextCursor ? (
              <div className="pagination-row">
                <Link
                  className="button secondary"
                  href={`/workspace/${organizationId}/notifications?cursor=${encodeURIComponent(result.nextCursor)}`}
                >
                  Older notifications
                </Link>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
