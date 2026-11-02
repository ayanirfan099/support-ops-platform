export default function WorkspaceLoading() {
  return (
    <main className="main-content" aria-busy="true" aria-live="polite">
      <p className="kicker">SupportOps workspace</p>
      <h1>Loading workspace…</h1>
      <div className="loading-placeholder" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="sr-only">Loading workspace data.</p>
    </main>
  );
}
