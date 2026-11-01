import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@supportops/database";
import { auth } from "../../src/lib/auth";

const email = `auth-fixture-${randomUUID()}@example.invalid`;
const password = "Fixture-password-2026!";
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", baseURL);
  return new Request(`${baseURL}/api/auth/${path}`, { ...init, headers });
}

describe("session authentication integration", () => {
  it("creates an HTTP-only session, resolves it, and invalidates it on sign-out", async () => {
    const signup = await auth.handler(
      request("sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Fixture Agent", email, password }),
      }),
    );
    expect(signup.status).toBeGreaterThanOrEqual(200);
    expect(signup.status).toBeLessThan(300);

    const cookieLines = signup.headers.getSetCookie();
    const sessionCookie = cookieLines.find((cookie) =>
      cookie.startsWith("better-auth.session_token="),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/httponly/i);
    const cookie = sessionCookie!.split(";", 1)[0];

    const currentSession = await auth.handler(
      request("get-session", { headers: { cookie } }),
    );
    expect(currentSession.status).toBe(200);
    await expect(currentSession.json()).resolves.toMatchObject({
      user: { email },
      session: { userId: expect.any(String) },
    });

    const signout = await auth.handler(
      request("sign-out", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(signout.status).toBeGreaterThanOrEqual(200);
    expect(signout.status).toBeLessThan(300);

    const afterSignout = await auth.handler(
      request("get-session", { headers: { cookie } }),
    );
    expect(afterSignout.status).toBe(200);
    await expect(afterSignout.json()).resolves.toBeNull();
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email } });
  await db.$disconnect();
});
