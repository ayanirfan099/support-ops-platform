"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@supportops/ui";
import { authClient } from "@/lib/auth-client";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: String(formData.get("name") ?? ""),
            email,
            password,
            callbackURL: "/workspace",
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: "/workspace",
          });
      if (result.error) {
        setError(
          "We could not complete that request. Check the details and try again.",
        );
      } else {
        router.push("/workspace");
      }
    } catch {
      setError(
        "SupportOps could not reach the sign-in service. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      {isSignUp && (
        <label className="field-label">
          Your name
          <input autoComplete="name" maxLength={100} name="name" required />
        </label>
      )}
      <label className="field-label">
        Email address
        <input
          autoComplete="email"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </label>
      <label className="field-label">
        Password
        <input
          autoComplete={isSignUp ? "new-password" : "current-password"}
          maxLength={128}
          minLength={isSignUp ? 12 : undefined}
          name="password"
          required
          type="password"
        />
      </label>
      <div className="form-status" role="status" aria-live="polite">
        {error}
      </div>
      <Button disabled={pending} type="submit">
        {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </Button>
      <p className="auth-switch">
        {isSignUp ? "Already have an account? " : "New to SupportOps? "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"}>
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
