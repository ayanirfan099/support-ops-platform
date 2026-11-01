import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@supportops/database";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be set to at least 32 characters.");
}

export const auth = betterAuth({
  appName: "SupportOps",
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL,
  secret,
  trustedOrigins: [
    baseURL,
    ...(process.env.NODE_ENV === "production" ? [] : ["https://*-*.e2b.app"]),
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "test",
      sameSite: "lax",
    },
  },
});
