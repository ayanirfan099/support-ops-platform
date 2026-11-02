"use client";

import Link from "next/link";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="main-content">
      <p className="kicker">Workspace unavailable</p>
      <h1>We couldn’t load this workspace</h1>
      <p className="lede" role="alert">
        Your changes were not confirmed. Please retry; if the problem continues,
        return to the workspace switcher.
      </p>
      <div className="error-actions">
        <button className="button" type="button" onClick={() => reset()}>
          Try again
        </button>
        <Link className="button secondary" href="/workspace">
          Workspace switcher
        </Link>
      </div>
    </main>
  );
}
