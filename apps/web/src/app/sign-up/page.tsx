import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Create account · SupportOps" };

export default function SignUpPage() {
  return (
    <main className="auth-wrap">
      <section className="auth-card" aria-labelledby="sign-up-title">
        <Brand />
        <h1 id="sign-up-title">Start with a workspace.</h1>
        <p className="panel-copy">
          Create a local demo account, then create a fictional support
          workspace.
        </p>
        <AuthForm mode="sign-up" />
        <div className="notice">
          Email verification and outbound email are not configured in this
          foundation build. This is not suitable for public production
          registration.
        </div>
      </section>
    </main>
  );
}
