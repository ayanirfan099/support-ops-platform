"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@supportops/ui";

interface KnowledgeCitation {
  documentId: string;
  title: string;
  chunkId: string;
  excerpt: string;
  startLine: number;
  endLine: number;
  score: number;
  rank: number;
}

interface SearchResult {
  searchId: string;
  rankerVersion: string;
  insufficientEvidence: boolean;
  corpusTruncated: boolean;
  citations: KnowledgeCitation[];
}

export function KnowledgeSearch({
  organizationId,
  ticketId,
}: {
  organizationId: string;
  ticketId: string;
}) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          ticketId,
          query: String(form.get("query") ?? ""),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Could not search this workspace. Try again.");
        return;
      }
      setResult(body as SearchResult);
    } catch {
      setError("SupportOps could not reach the knowledge service. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel evidence-panel" aria-labelledby="evidence-title">
      <div className="section-heading-row">
        <div>
          <p className="kicker">Workspace sources</p>
          <h2 className="panel-title" id="evidence-title">
            Find evidence
          </h2>
        </div>
      </div>
      <p className="panel-copy">
        Search uses lexical ranking. Scores order excerpts; they are not
        probabilities or proof.
      </p>
      <form className="compact-form evidence-form" onSubmit={submit}>
        <label className="field-label">
          Search knowledge
          <input maxLength={400} name="query" required />
        </label>
        <Button disabled={pending} type="submit">
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>
      {error ? (
        <p className="form-status" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="evidence-results" aria-live="polite">
          <div className="evidence-result-note">
            {result.insufficientEvidence
              ? "Insufficient evidence: no excerpt passed the support threshold."
              : `${result.citations.length} source citation${result.citations.length === 1 ? "" : "s"} · ${result.rankerVersion}`}
          </div>
          {result.corpusTruncated ? (
            <p className="form-status">
              Search used the newest 500 excerpts; older sources may be omitted.
            </p>
          ) : null}
          {result.citations.map((citation) => (
            <article
              className="citation-card"
              key={`${result.searchId}-${citation.rank}`}
            >
              <div className="citation-heading">
                <strong>{citation.title}</strong>
                <span className="citation-source">
                  Lines {citation.startLine}
                  {citation.endLine !== citation.startLine
                    ? `–${citation.endLine}`
                    : ""}
                </span>
              </div>
              <p>{citation.excerpt}</p>
              <span className="message-visibility">
                Lexical rank {citation.score.toFixed(3)} · not a confidence
                score
              </span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
