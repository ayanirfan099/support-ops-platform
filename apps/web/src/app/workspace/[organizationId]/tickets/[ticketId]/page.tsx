import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { MembershipRequiredError } from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { TicketActions } from "@/components/ticket-actions";
import { auth } from "@/lib/auth";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { getTicket, TicketNotFoundError } from "@/lib/tickets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ticket · SupportOps" };

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string; ticketId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const { organizationId, ticketId } = await params;

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

  let ticket;
  try {
    ticket = await getTicket(organizationId, ticketId);
  } catch (error) {
    if (error instanceof TicketNotFoundError) notFound();
    throw error;
  }

  const agents = await db.membership.findMany({
    where: { organizationId, role: "agent" },
    select: {
      id: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="app-frame">
      <aside className="rail">
        <Brand />
        <nav aria-label="Workspace navigation">
          <p className="workspace-label">{organization.name}</p>
          <Link className="nav-link" href={`/workspace/${organizationId}`}>
            ◈ Overview
          </Link>
          <Link
            className="nav-link active"
            href={`/workspace/${organizationId}/tickets`}
          >
            ▤ Tickets
          </Link>
          <span className="nav-link" aria-disabled="true">
            ⌕ Knowledge · M3
          </span>
        </nav>
        <div className="rail-foot">
          <strong>Ticket #{ticket.id.slice(-6).toUpperCase()}</strong>
          <br />
          Public replies and team-only notes use separate records.
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">
            {organization.name} / Ticket detail
          </span>
          <SignOutButton />
        </header>
        <main className="main-content ticket-detail-page">
          <Link
            className="back-link"
            href={`/workspace/${organizationId}/tickets`}
          >
            ← Back to queue
          </Link>
          <div className="ticket-detail-heading">
            <div>
              <p className="kicker">
                Ticket #{ticket.id.slice(-6).toUpperCase()} ·{" "}
                {ticket.customer.name}
              </p>
              <h1>{ticket.subject}</h1>
              <p className="lede">{ticket.description}</p>
            </div>
            <div className="ticket-heading-badges">
              <span className={`status-pill status-${ticket.status}`}>
                {ticket.status}
              </span>
              <span className={`priority-label priority-${ticket.priority}`}>
                {ticket.priority}
              </span>
              <span className={`sla-label sla-${ticket.slaState}`}>
                SLA · {ticket.slaState.replace("_", " ")}
              </span>
            </div>
          </div>

          <section className="ticket-detail-grid">
            <div className="ticket-main-column">
              <section
                className="panel conversation-panel"
                aria-labelledby="conversation-title"
              >
                <div className="section-heading-row">
                  <div>
                    <p className="kicker">Customer-visible</p>
                    <h2 className="panel-title" id="conversation-title">
                      Conversation
                    </h2>
                  </div>
                  <span className="count-badge">
                    {ticket.messages.length} replies
                  </span>
                </div>
                <div className="message-list">
                  <article className="message-card customer-original">
                    <div className="message-meta">
                      <strong>{ticket.customer.name}</strong>
                      <time dateTime={ticket.createdAt.toISOString()}>
                        {ticket.createdAt.toLocaleString()}
                      </time>
                    </div>
                    <p>{ticket.description}</p>
                    <span className="message-visibility">Original request</span>
                  </article>
                  {ticket.messages.map((message) => (
                    <article
                      className="message-card agent-message"
                      key={message.id}
                    >
                      <div className="message-meta">
                        <strong>
                          {message.author?.name ?? "Support team"}
                        </strong>
                        <time dateTime={message.createdAt.toISOString()}>
                          {message.createdAt.toLocaleString()}
                        </time>
                      </div>
                      <p>{message.body}</p>
                      <span className="message-visibility">
                        Customer-visible · not emailed
                      </span>
                    </article>
                  ))}
                </div>
              </section>

              <section
                className="panel internal-notes-panel"
                aria-labelledby="notes-title"
              >
                <div className="section-heading-row">
                  <div>
                    <p className="kicker">Team only</p>
                    <h2 className="panel-title" id="notes-title">
                      Internal notes
                    </h2>
                  </div>
                  <span className="count-badge">
                    {ticket.internalNotes.length} notes
                  </span>
                </div>
                {ticket.internalNotes.length === 0 ? (
                  <p className="panel-copy">
                    No internal notes yet. Notes stay separate from the customer
                    conversation.
                  </p>
                ) : (
                  <div className="message-list">
                    {ticket.internalNotes.map((note) => (
                      <article
                        className="message-card internal-note-card"
                        key={note.id}
                      >
                        <div className="message-meta">
                          <strong>
                            {note.author?.name ?? "Former teammate"}
                          </strong>
                          <time dateTime={note.createdAt.toISOString()}>
                            {note.createdAt.toLocaleString()}
                          </time>
                        </div>
                        <p>{note.body}</p>
                        <span className="message-visibility">
                          Internal only · not sent
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="panel activity-panel"
                aria-labelledby="activity-title"
              >
                <h2 className="panel-title" id="activity-title">
                  Activity timeline
                </h2>
                <ol className="activity-list">
                  {ticket.activities.map((activity) => (
                    <li key={activity.id}>
                      <span className="activity-dot" aria-hidden="true" />
                      <div>
                        <strong>{activity.summary}</strong>
                        <span className="muted-small">
                          {activity.actor?.name ?? "SupportOps"} ·{" "}
                          {activity.createdAt.toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <aside className="ticket-side-column" aria-label="Ticket controls">
              <section
                className="panel customer-card"
                aria-labelledby="customer-card-title"
              >
                <p className="kicker">Customer</p>
                <h2 className="panel-title" id="customer-card-title">
                  {ticket.customer.name}
                </h2>
                <a
                  href={`mailto:${ticket.customer.email}`}
                  className="customer-email"
                >
                  {ticket.customer.email}
                </a>
                <dl className="ticket-facts">
                  <div>
                    <dt>Created</dt>
                    <dd>
                      <time dateTime={ticket.createdAt.toISOString()}>
                        {ticket.createdAt.toLocaleDateString()}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt>Assignee</dt>
                    <dd>{ticket.assignee?.name ?? "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>{ticket.version}</dd>
                  </div>
                </dl>
              </section>
              <TicketActions
                organizationId={organizationId}
                ticketId={ticket.id}
                version={ticket.version}
                status={ticket.status}
                priority={ticket.priority}
                role={membership.role}
                assignees={agents.map(({ id, user }) => ({
                  membershipId: id,
                  name: user.name,
                }))}
                tags={ticket.tags}
              />
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
