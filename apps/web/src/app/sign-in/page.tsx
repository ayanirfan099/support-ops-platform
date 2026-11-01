import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Sign in · SupportOps" };

export default function SignInPage() {
  return (
    <main className="auth-wrap">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <Brand />
        <h1 id="sign-in-title">Welcome back.</h1>
        <p className="panel-copy">
          Sign in to continue to your support workspace.
        </p>
        <AuthForm mode="sign-in" />
      </section>
    </main>
  );
}
