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
          Secure workspaces and a human-supervised ticket queue, with public
          replies kept separate from team-only notes.
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
          Development preview only. Use fictional data. Public replies are saved
          to the ticket but are not emailed; knowledge and AI workflows are not
          implemented yet.
        </div>
      </section>
    </main>
  );
}
