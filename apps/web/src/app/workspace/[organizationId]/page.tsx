import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { MembershipRequiredError } from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceNav } from "@/components/workspace-nav";
import { auth } from "@/lib/auth";
import { getWorkspaceMetrics } from "@/lib/analytics";
import { requireWorkspaceMembership } from "@/lib/authorization";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspace · SupportOps" };

export default async function OrganizationHome({
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
    select: { id: true, name: true },
  });
  if (!organization) notFound();
  const metrics = await getWorkspaceMetrics(organizationId);

  return (
    <div className="app-frame">
      <aside className="rail">
        <Brand />
        <WorkspaceNav
          organizationId={organizationId}
          role={membership.role}
          active="overview"
        />
        <div className="rail-foot">
          <strong>Human-reviewed by design</strong>
          <br />
          Routing suggestions will never replace an agent decision.
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">{organization.name}</span>
          <SignOutButton />
        </header>
        <main className="main-content">
          <p className="kicker">Workspace · {membership.role}</p>
          <h1>{organization.name}</h1>
          <p className="lede">
            Work your queue, keep customer replies distinct from private team
            notes, and see ticket history in one place.
          </p>
          <section
            className="panel"
            aria-labelledby="queue-snapshot-title"
            style={{ marginTop: 28 }}
          >
            <h2 className="panel-title" id="queue-snapshot-title">
              Queue snapshot
            </h2>
            <p className="panel-copy">
              Signed in as <strong>{session.user.email}</strong> ·{" "}
              <strong>{membership.role}</strong> role. Workspace access was
              verified on the server.
            </p>
            <div className="queue-stats" aria-label="Workspace ticket metrics">
              <div>
                <strong>{metrics.active}</strong>
                <span>active tickets</span>
              </div>
              <div>
                <strong>{metrics.unassigned}</strong>
                <span>unassigned active</span>
              </div>
              <div>
                <strong>{metrics.urgent}</strong>
                <span>urgent active</span>
              </div>
              <div>
                <strong>{metrics.slaAtRisk}</strong>
                <span>past SLA target · active</span>
              </div>
              <div>
                <strong>{metrics.total}</strong>
                <span>all tickets</span>
              </div>
              <div>
                <strong>{metrics.createdLast7Days}</strong>
                <span>created · last 7 days</span>
              </div>
              <div>
                <strong>{metrics.resolvedLast7Days}</strong>
                <span>resolved · last 7 days</span>
              </div>
              <div>
                <strong>{metrics.knowledgeSearchesLast7Days}</strong>
                <span>knowledge searches · last 7 days</span>
              </div>
              <div>
                <strong>
                  {metrics.triageAcceptanceRateLast7Days === null
                    ? "—"
                    : `${metrics.triageAcceptanceRateLast7Days}%`}
                </strong>
                <span>
                  triage accepted · last 7 days
                  {metrics.triageAcceptanceRateLast7Days === null
                    ? " · no reviews"
                    : ` · ${metrics.triageAcceptedLast7Days} accepted / ${metrics.triageOverriddenLast7Days} overridden`}
                </span>
              </div>
            </div>
            <div className="metrics-breakdowns">
              <section
                className="queue-breakdown"
                aria-labelledby="queue-breakdown-title"
              >
                <h3 id="queue-breakdown-title">Active tickets by queue</h3>
                {metrics.byQueue.length ? (
                  <ul>
                    {metrics.byQueue.map(({ queue, count }) => (
                      <li key={queue}>
                        <span>
                          {queue === "untriaged"
                            ? "Untriaged"
                            : `${queue[0]!.toUpperCase()}${queue.slice(1)}`}
                        </span>
                        <strong>{count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">
                    No active tickets in this workspace yet.
                  </p>
                )}
              </section>
              <section
                className="queue-breakdown"
                aria-labelledby="status-breakdown-title"
              >
                <h3 id="status-breakdown-title">Active tickets by status</h3>
                {metrics.byStatus.length ? (
                  <ul>
                    {metrics.byStatus.map(({ status, count }) => (
                      <li key={status}>
                        <span>
                          {status[0]!.toUpperCase()}
                          {status.slice(1)}
                        </span>
                        <strong>{count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">
                    No active tickets to break down.
                  </p>
                )}
              </section>
              <section
                className="queue-breakdown"
                aria-labelledby="priority-breakdown-title"
              >
                <h3 id="priority-breakdown-title">
                  Active tickets by priority
                </h3>
                {metrics.byPriority.length ? (
                  <ul>
                    {metrics.byPriority.map(({ priority, count }) => (
                      <li key={priority}>
                        <span>
                          {priority[0]!.toUpperCase()}
                          {priority.slice(1)}
                        </span>
                        <strong>{count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">
                    No active tickets to break down.
                  </p>
                )}
              </section>
              <section
                className="queue-breakdown"
                aria-labelledby="agent-workload-title"
              >
                <h3 id="agent-workload-title">Active tickets by agent</h3>
                {metrics.agentWorkload.length ? (
                  <>
                    <ul>
                      {metrics.agentWorkload.map((agent) => (
                        <li key={agent.membershipId}>
                          <span>{agent.name}</span>
                          <strong>{agent.activeTickets}</strong>
                        </li>
                      ))}
                    </ul>
                    {metrics.agentWorkloadTruncated ? (
                      <p className="panel-copy">
                        Showing the first 500 active assignments.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="empty-state">
                    No active tickets are assigned to an agent.
                  </p>
                )}
              </section>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Link
                className="button"
                href={`/workspace/${organizationId}/tickets`}
              >
                Open ticket queue
              </Link>
              <Link
                className="button secondary"
                href={`/workspace/${organizationId}/notifications`}
              >
                View notifications
              </Link>
              <Link className="button secondary" href="/workspace">
                Switch workspace
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
