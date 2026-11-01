"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@supportops/ui";

export function KnowledgeCreateForm({
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
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/knowledge/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          title: String(data.get("title") ?? ""),
          content: String(data.get("content") ?? ""),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not save this document. Try again.");
        return;
      }
      router.push(`/workspace/${organizationId}/knowledge`);
      router.refresh();
    } catch {
      setError("SupportOps could not reach the knowledge service. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="ticket-form" onSubmit={submit}>
      <section
        className="panel form-section"
        aria-labelledby="knowledge-source-title"
      >
        <div className="form-section-heading">
          <span className="step-index">01</span>
          <div>
            <h2 className="panel-title" id="knowledge-source-title">
              Text source
            </h2>
            <p className="panel-copy">
              Plain text only in M3. Excerpts retain source line numbers; PDFs
              and uploads are not enabled.
            </p>
          </div>
        </div>
        <label className="field-label">
          Document title
          <input autoComplete="off" maxLength={200} name="title" required />
        </label>
        <label className="field-label">
          Source text
          <textarea
            maxLength={32_000}
            minLength={1}
            name="content"
            rows={16}
            required
          />
        </label>
      </section>
      {error ? (
        <p className="form-status" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-footer">
        <p className="panel-copy">
          Maximum 32,000 characters. No external model or paid API is used.
        </p>
        <Button disabled={pending} type="submit">
          {pending ? "Indexing…" : "Save text document"}
        </Button>
      </div>
    </form>
  );
}
