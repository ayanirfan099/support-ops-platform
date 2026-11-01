import Link from "next/link";
import { Brand } from "@/components/brand";

export default function HomePage() {
  return (
    <main className="auth-wrap">
      <section className="auth-card" aria-labelledby="welcome-title">
        <Brand />
        <p className="kicker" style={{ marginTop: 34 }}>
          Support, with evidence
        </p>
        <h1 id="welcome-title">A calmer way to run the queue.</h1>
        <p className="lede">
          A foundation build for secure workspaces and human-supervised support
          operations. Ticketing and evidence workflows are coming in later
          milestones.
        </p>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}
        >
          <Link className="button" href="/sign-in">
            Sign in
          </Link>
          <Link className="button secondary" href="/sign-up">
            Create an account
          </Link>
        </div>
        <div className="notice">
          Foundation preview only. Do not enter customer data; ticketing,
          tenant-safe workflows, and operational review are not implemented yet.
        </div>
      </section>
    </main>
  );
}
