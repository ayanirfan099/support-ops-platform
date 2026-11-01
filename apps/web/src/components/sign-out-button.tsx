"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@supportops/ui";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/sign-in");
      }}
      type="button"
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
