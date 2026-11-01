"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@supportops/ui";

export function KnowledgeDeleteButton({
  organizationId,
  documentId,
  title,
}: {
  organizationId: string;
  documentId: string;
  title: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function removeDocument() {
    if (
      !window.confirm(
        `Delete “${title}”? Its excerpts and saved citations will also be deleted.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/knowledge/documents/${documentId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body.error ?? "Could not delete this source. Refresh and try again.",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("SupportOps could not delete this source. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="knowledge-delete-control">
      <Button
        disabled={pending}
        onClick={removeDocument}
        type="button"
        variant="secondary"
      >
        {pending ? "Deleting…" : "Delete source"}
      </Button>
      {error ? (
        <p className="form-status" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
