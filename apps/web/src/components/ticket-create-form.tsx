"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@supportops/ui";

export function TicketCreateForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const slaLocal = String(form.get("slaTargetAt") ?? "");
    const payload = {
      organizationId,
      subject: String(form.get("subject") ?? ""),
      description: String(form.get("description") ?? ""),
      priority: String(form.get("priority") ?? "normal"),
      ...(slaLocal ? { slaTargetAt: new Date(slaLocal).toISOString() } : {}),
      customer: {
        name: String(form.get("customerName") ?? ""),
        email: String(form.get("customerEmail") ?? ""),
      },
    };

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not create this ticket. Try again.");
        return;
      }
      router.push(`/workspace/${organizationId}/tickets/${result.id}`);
      router.refresh();
    } catch {
      setError("SupportOps could not reach the ticket service. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="ticket-form" onSubmit={submit}>
      <section
        className="panel form-section"
        aria-labelledby="ticket-details-title"
      >
        <div className="form-section-heading">
          <span className="step-index">01</span>
          <div>
            <h2 id="ticket-details-title" className="panel-title">
              Ticket details
            </h2>
            <p className="panel-copy">
              A concise subject and a clear description help the team respond.
            </p>
          </div>
        </div>
        <label className="field-label">
          Subject
          <input maxLength={180} minLength={3} name="subject" required />
        </label>
        <label className="field-label">
          Description
          <textarea
            maxLength={10_000}
            minLength={3}
            name="description"
            rows={6}
            required
          />
        </label>
        <div className="field-grid">
          <label className="field-label">
            Priority
            <select defaultValue="normal" name="priority">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="field-label">
            SLA target <span className="optional-label">optional</span>
            <input name="slaTargetAt" type="datetime-local" />
          </label>
        </div>
      </section>

      <section
        className="panel form-section"
        aria-labelledby="customer-details-title"
      >
        <div className="form-section-heading">
          <span className="step-index">02</span>
          <div>
            <h2 id="customer-details-title" className="panel-title">
              Customer
            </h2>
            <p className="panel-copy">
              Customers are unique within this workspace by email.
            </p>
          </div>
        </div>
        <div className="field-grid">
          <label className="field-label">
            Customer name
            <input
              autoComplete="name"
              maxLength={100}
              name="customerName"
              required
            />
          </label>
          <label className="field-label">
            Customer email
            <input
              autoComplete="email"
              maxLength={254}
              name="customerEmail"
              required
              type="email"
            />
          </label>
        </div>
      </section>

      <div className="form-footer">
        <p className="form-status" role="alert" aria-live="polite">
          {error}
        </p>
        <Button disabled={pending} type="submit">
          {pending ? "Creating…" : "Create ticket"}
        </Button>
      </div>
    </form>
  );
}
