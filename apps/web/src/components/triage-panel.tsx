"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ticketQueueSchema, type TicketQueue } from "@supportops/contracts";
import { Button } from "@supportops/ui";

interface TriageSuggestionView {
  id: string;
  suggestedQueue: TicketQueue | null;
  scores: Record<TicketQueue, number>;
  modelVersion: string;
  abstained: boolean;
  abstentionReason: string | null;
  reviewStatus: "pending" | "accepted" | "overridden";
  reviewedQueue: TicketQueue | null;
  reviewReason: string | null;
  createdAt: string;
}

const queues = ticketQueueSchema.options;

export function TriagePanel({
  organizationId,
  ticketId,
  version,
  suggestions: initialSuggestions,
}: {
  organizationId: string;
  ticketId: string;
  version: number;
  suggestions: TriageSuggestionView[];
}) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [ticketVersion, setTicketVersion] = useState(version);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const currentVersion = Math.max(version, ticketVersion);

  async function requestSuggestion() {
    setError("");
    setNotice("");
    setPending(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/triage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Could not get a suggestion. Try again.");
        return;
      }
      const newSuggestion: TriageSuggestionView = {
        id: body.suggestionId,
        suggestedQueue: body.suggestedQueue,
        scores: body.scores,
        modelVersion: body.modelVersion,
        abstained: body.abstained,
        abstentionReason: body.abstentionReason,
        reviewStatus: body.reviewStatus,
        reviewedQueue: null,
        reviewReason: null,
        createdAt: body.createdAt,
      };
      setSuggestions((current) => [newSuggestion, ...current].slice(0, 5));
      setNotice(
        "Suggestion saved for human review. Ticket routing was not changed.",
      );
      router.refresh();
    } catch {
      setError("SupportOps could not reach the triage service. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function review(
    event: FormEvent<HTMLFormElement>,
    suggestionId: string,
  ) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    const queue = String(data.get("queue")) as TicketQueue;
    const reason = String(data.get("reason") ?? "");
    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/triage/${suggestionId}/review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            organizationId,
            queue,
            ...(reason.trim() ? { reason: reason.trim() } : {}),
            expectedVersion: currentVersion,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(
          body.error ?? "Could not save this review. Refresh and try again.",
        );
        return;
      }
      setTicketVersion(currentVersion + 1);
      setSuggestions((current) =>
        current.map((suggestion) =>
          suggestion.id === suggestionId
            ? {
                ...suggestion,
                reviewStatus: body.reviewStatus,
                reviewedQueue: body.queue,
                reviewReason: reason || null,
              }
            : suggestion,
        ),
      );
      setNotice(
        "Human decision saved; the ticket queue now reflects your review.",
      );
      router.refresh();
    } catch {
      setError("SupportOps could not save this review. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel triage-panel" aria-labelledby="triage-title">
      <div className="section-heading-row">
        <div>
          <p className="kicker">Advisory only</p>
          <h2 className="panel-title" id="triage-title">
            Triage suggestion
          </h2>
        </div>
      </div>
      <p className="panel-copy">
        A local model proposes a queue from the original request. It never
        routes a ticket automatically.
      </p>
      <Button
        disabled={pending}
        onClick={requestSuggestion}
        type="button"
        variant="secondary"
      >
        {pending ? "Reviewing…" : "Get suggestion"}
      </Button>
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
      <div className="triage-suggestions">
        {suggestions.map((suggestion) => (
          <article className="triage-suggestion" key={suggestion.id}>
            <div className="citation-heading">
              <strong>
                {suggestion.abstained
                  ? "Review needed — model abstained"
                  : `Suggested: ${suggestion.suggestedQueue}`}
              </strong>
              <span className="citation-source">{suggestion.modelVersion}</span>
            </div>
            {suggestion.abstentionReason ? (
              <p className="muted-small">
                Reason: {suggestion.abstentionReason.replaceAll("_", " ")}
              </p>
            ) : null}
            <p className="score-warning">
              Synthetic-fixture score; not a calibrated probability.
            </p>
            <div className="score-list" aria-label="Uncalibrated queue scores">
              {queues.map((queue) => (
                <span key={queue}>
                  {queue}{" "}
                  <strong>
                    {suggestion.scores[queue]?.toFixed(3) ?? "0.000"}
                  </strong>
                </span>
              ))}
            </div>
            {suggestion.reviewStatus === "pending" ? (
              <form
                className="form-stack triage-review-form"
                onSubmit={(event) => review(event, suggestion.id)}
              >
                <label className="field-label">
                  Human-selected queue
                  <select
                    defaultValue={suggestion.suggestedQueue ?? ""}
                    name="queue"
                    required
                  >
                    <option value="" disabled>
                      Select a queue
                    </option>
                    {queues.map((queue) => (
                      <option key={queue} value={queue}>
                        {queue}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Review reason <span className="optional-label">optional</span>
                  <input maxLength={500} name="reason" />
                </label>
                <Button disabled={pending} type="submit">
                  Save human decision
                </Button>
              </form>
            ) : (
              <p className="review-outcome">
                Human {suggestion.reviewStatus}: {suggestion.reviewedQueue}
                {suggestion.reviewReason ? ` · ${suggestion.reviewReason}` : ""}
              </p>
            )}
          </article>
        ))}
        {suggestions.length === 0 ? (
          <p className="panel-copy">
            No suggestions yet. Request one for human review.
          </p>
        ) : null}
      </div>
    </section>
  );
}
