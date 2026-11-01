import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import {
  MembershipRequiredError,
  ticketListFiltersSchema,
} from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import { requireWorkspaceMembership } from "@/lib/authorization";
import { listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tickets · SupportOps" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TicketListPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: SearchParams;
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
  const rawFilters = await searchParams;
  const [assignees, tags] = await Promise.all([
    db.membership.findMany({
      where: { organizationId },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.tag.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const parsedFilters = ticketListFiltersSchema.safeParse({
    organizationId,
    status: rawFilters.status,
    priority: rawFilters.priority,
    query: rawFilters.query,
    assigneeMembershipId: rawFilters.assigneeMembershipId,
    tag: rawFilters.tag,
    page: rawFilters.page,
    pageSize: 25,
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : ticketListFiltersSchema.parse({ organizationId });
  const result = await listTickets(filters);
  const hasFilters = Boolean(
    filters.status ||
      filters.priority ||
      filters.query ||
      filters.assigneeMembershipId ||
      filters.tag,
  );

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
          <strong>{membership.role}</strong>
          <br />
          Workspace records are scoped server-side to your membership.
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">{organization.name} / Tickets</span>
          <SignOutButton />
        </header>
        <main className="main-content">
          <div className="page-heading-row">
            <div>
              <p className="kicker">Ticket operations</p>
              <h1>Support queue</h1>
              <p className="lede">
                Search, triage, reply, and keep internal notes separate from
                customer-visible messages.
              </p>
            </div>
            <Link
              className="button"
              href={`/workspace/${organizationId}/tickets/new`}
            >
              Create ticket
            </Link>
          </div>

          <form className="filter-bar" method="get" role="search">
            <label className="field-label search-field">
              Search tickets
              <input
                defaultValue={
                  typeof rawFilters.query === "string" ? rawFilters.query : ""
                }
                maxLength={200}
                name="query"
                placeholder="Subject, description, customer…"
              />
            </label>
            <label className="field-label">
              Status
              <select defaultValue={filters.status ?? ""} name="status">
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="field-label">
              Priority
              <select defaultValue={filters.priority ?? ""} name="priority">
                <option value="">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="field-label">
              Assignee
              <select
                defaultValue={filters.assigneeMembershipId ?? ""}
                name="assigneeMembershipId"
              >
                <option value="">Anyone</option>
                {assignees.map(({ id, user }) => (
                  <option key={id} value={id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Tag
              <select defaultValue={filters.tag ?? ""} name="tag">
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button secondary filter-submit" type="submit">
              Apply filters
            </button>
          </form>

          <section className="ticket-table-wrap" aria-label="Ticket list">
            {result.items.length === 0 ? (
              <div className="empty-state">
                <span className="empty-mark" aria-hidden="true">
                  ＋
                </span>
                <h2>
                  {result.total === 0 && !hasFilters
                    ? "Your queue is clear."
                    : "No tickets match."}
                </h2>
                <p>
                  {result.total === 0 && !hasFilters
                    ? "Create your first ticket to start a customer conversation."
                    : "Try a broader search or clear one of the filters."}
                </p>
                {result.total === 0 && !hasFilters && (
                  <Link
                    className="button"
                    href={`/workspace/${organizationId}/tickets/new`}
                  >
                    Create the first ticket
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="ticket-table-scroll">
                  <table className="ticket-table">
                    <thead>
                      <tr>
                        <th scope="col">Ticket</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Status</th>
                        <th scope="col">Priority</th>
                        <th scope="col">Assignee</th>
                        <th scope="col">SLA</th>
                        <th scope="col">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((ticket) => (
                        <tr key={ticket.id}>
                          <td>
                            <Link
                              className="ticket-subject"
                              href={`/workspace/${organizationId}/tickets/${ticket.id}`}
                            >
                              <span className="ticket-number">
                                #{ticket.id.slice(-6).toUpperCase()}
                              </span>
                              {ticket.subject}
                            </Link>
                            <span className="ticket-tags">
                              {ticket.tags.map((tag) => (
                                <span className="tag-chip" key={tag.id}>
                                  {tag.name}
                                </span>
                              ))}
                            </span>
                          </td>
                          <td>
                            <span className="customer-name">
                              {ticket.customer.name}
                            </span>
                            <span className="muted-small">
                              {ticket.customer.email}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-pill status-${ticket.status}`}
                            >
                              {ticket.status}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`priority-label priority-${ticket.priority}`}
                            >
                              {ticket.priority}
                            </span>
                          </td>
                          <td>
                            {ticket.assignee?.name ?? (
                              <span className="muted-small">Unassigned</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`sla-label sla-${ticket.slaState}`}
                            >
                              {ticket.slaState === "none"
                                ? "—"
                                : ticket.slaState.replace("_", " ")}
                            </span>
                          </td>
                          <td>
                            <time dateTime={ticket.updatedAt.toISOString()}>
                              {ticket.updatedAt.toLocaleDateString()}
                            </time>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span>
                    {result.total} {result.total === 1 ? "ticket" : "tickets"}
                  </span>
                  <div className="pagination-controls">
                    {filters.page > 1 && (
                      <Link
                        className="button secondary small-button"
                        href={pageHref(
                          organizationId,
                          filters,
                          filters.page - 1,
                        )}
                      >
                        Previous
                      </Link>
                    )}
                    <span>
                      Page {filters.page} of {Math.max(1, result.totalPages)}
                    </span>
                    {filters.page < result.totalPages && (
                      <Link
                        className="button secondary small-button"
                        href={pageHref(
                          organizationId,
                          filters,
                          filters.page + 1,
                        )}
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function pageHref(
  organizationId: string,
  filters: {
    query?: string;
    status?: string;
    priority?: string;
    assigneeMembershipId?: string;
    tag?: string;
    pageSize: number;
  },
  page: number,
) {
  const search = new URLSearchParams({
    page: String(page),
    pageSize: String(filters.pageSize),
  });
  if (filters.query) search.set("query", filters.query);
  if (filters.status) search.set("status", filters.status);
  if (filters.priority) search.set("priority", filters.priority);
  if (filters.assigneeMembershipId) {
    search.set("assigneeMembershipId", filters.assigneeMembershipId);
  }
  if (filters.tag) search.set("tag", filters.tag);
  return `/workspace/${organizationId}/tickets?${search.toString()}`;
}
