"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  canTransitionTicket,
  type MemberRole,
  type TicketPriority,
  type TicketStatus,
} from "@supportops/contracts";
import { Button } from "@supportops/ui";

interface AssigneeOption {
  membershipId: string;
  name: string;
}

interface TicketActionsProps {
  organizationId: string;
  ticketId: string;
  version: number;
  status: TicketStatus;
  priority: TicketPriority;
  role: MemberRole;
  assignees: AssigneeOption[];
  tags: Array<{ id: string; name: string }>;
}

const statuses: TicketStatus[] = [
  "new",
  "open",
  "pending",
  "resolved",
  "closed",
];
const priorities: TicketPriority[] = ["low", "normal", "high", "urgent"];

export function TicketActions({
  organizationId,
  ticketId,
  version,
  status,
  priority,
  role,
  assignees,
  tags,
}: TicketActionsProps) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const manager = role === "owner" || role === "manager";

  async function mutate(
    path: string,
    method: string,
    body?: Record<string, unknown>,
  ) {
    setError("");
    setNotice("");
    setPending(true);
    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok) {
        setError(
          result?.error ?? "Could not save this change. Refresh and try again.",
        );
        return false;
      }
      setNotice("Saved");
      router.refresh();
      return true;
    } catch {
      setError("SupportOps could not reach the ticket service. Try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function submitText(
    event: FormEvent<HTMLFormElement>,
    endpoint: "messages" | "notes" | "tags",
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = String(data.get("body") ?? data.get("name") ?? "");
    const saved = await mutate(`/api/tickets/${ticketId}/${endpoint}`, "POST", {
      organizationId,
      [endpoint === "tags" ? "name" : "body"]: body,
    });
    if (saved) form.reset();
  }

  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate(`/api/tickets/${ticketId}/transition`, "POST", {
      organizationId,
      status: String(form.get("status")),
      expectedVersion: version,
    });
  }

  async function changePriority(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate(`/api/tickets/${ticketId}/priority`, "POST", {
      organizationId,
      priority: String(form.get("priority")),
      expectedVersion: version,
    });
  }

  async function changeAssignee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate(`/api/tickets/${ticketId}/assignment`, "POST", {
      organizationId,
      membershipId: String(form.get("membershipId")),
      expectedVersion: version,
    });
  }

  return (
    <div className="ticket-actions">
      <section
        className="panel action-section"
        aria-labelledby="status-change-title"
      >
        <h2 className="panel-title" id="status-change-title">
          Update ticket
        </h2>
        <form className="compact-form" onSubmit={changeStatus}>
          <label className="field-label">
            Status
            <select
              key={`${status}-${version}`}
              defaultValue={status}
              name="status"
            >
              <option value={status}>{status} (current)</option>
              {statuses
                .filter((candidate) => canTransitionTicket(status, candidate))
                .map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {candidate}
                  </option>
                ))}
            </select>
          </label>
          <Button disabled={pending} type="submit">
            Save status
          </Button>
        </form>
      </section>

      <section
        className="panel action-section"
        aria-labelledby="priority-change-title"
      >
        <h2 className="panel-title" id="priority-change-title">
          Set priority
        </h2>
        <form className="compact-form" onSubmit={changePriority}>
          <label className="field-label">
            Priority
            <select
              key={`${priority}-${version}`}
              defaultValue={priority}
              name="priority"
            >
              <option value={priority}>{priority} (current)</option>
              {priorities
                .filter((candidate) => candidate !== priority)
                .map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {candidate}
                  </option>
                ))}
            </select>
          </label>
          <Button disabled={pending} type="submit">
            Save priority
          </Button>
        </form>
      </section>

      {manager && (
        <section
          className="panel action-section"
          aria-labelledby="assignment-title"
        >
          <h2 className="panel-title" id="assignment-title">
            Assign to an agent
          </h2>
          {assignees.length === 0 ? (
            <p className="panel-copy">
              No agents have joined this workspace yet.
            </p>
          ) : (
            <form className="compact-form" onSubmit={changeAssignee}>
              <label className="field-label">
                Agent
                <select name="membershipId" required defaultValue="">
                  <option value="" disabled>
                    Select an agent
                  </option>
                  {assignees.map((agent) => (
                    <option key={agent.membershipId} value={agent.membershipId}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button disabled={pending} type="submit">
                Assign
              </Button>
            </form>
          )}
        </section>
      )}

      <section className="panel action-section" aria-labelledby="tags-title">
        <h2 className="panel-title" id="tags-title">
          Tags
        </h2>
        <div className="tag-management">
          {tags.map((tag) => (
            <span className="tag-chip tag-removable" key={tag.id}>
              {tag.name}
              <button
                aria-label={`Remove ${tag.name} tag`}
                disabled={pending}
                onClick={() =>
                  mutate(
                    `/api/tickets/${ticketId}/tags/${encodeURIComponent(tag.name)}?organizationId=${encodeURIComponent(organizationId)}`,
                    "DELETE",
                  )
                }
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <span className="muted-small">No tags yet.</span>
          )}
        </div>
        <form
          className="compact-form tag-form"
          onSubmit={(event) => submitText(event, "tags")}
        >
          <label className="field-label">
            Add a tag
            <input maxLength={32} name="name" required />
          </label>
          <Button disabled={pending} variant="secondary" type="submit">
            Add tag
          </Button>
        </form>
      </section>

      <section
        className="panel action-section reply-section"
        aria-labelledby="reply-title"
      >
        <h2 className="panel-title" id="reply-title">
          Reply to customer
        </h2>
        <p className="panel-copy">
          Visible in the customer conversation. Email delivery is not
          configured.
        </p>
        <form
          className="form-stack"
          onSubmit={(event) => submitText(event, "messages")}
        >
          <label className="field-label">
            Public reply
            <textarea maxLength={10_000} name="body" rows={4} required />
          </label>
          <Button disabled={pending} type="submit">
            Add public reply
          </Button>
        </form>
      </section>

      <section
        className="panel action-section note-section"
        aria-labelledby="internal-note-title"
      >
        <div className="note-banner">
          Internal only · never sent to the customer
        </div>
        <h2 className="panel-title" id="internal-note-title">
          Add an internal note
        </h2>
        <form
          className="form-stack"
          onSubmit={(event) => submitText(event, "notes")}
        >
          <label className="field-label">
            Note for your team
            <textarea maxLength={10_000} name="body" rows={4} required />
          </label>
          <Button disabled={pending} variant="secondary" type="submit">
            Save internal note
          </Button>
        </form>
      </section>

      <div className="action-feedback" aria-live="polite">
        {error ? (
          <p className="form-status" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="success-status" role="status">
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
