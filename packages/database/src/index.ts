import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  supportOpsPrisma?: PrismaClient;
};

export const db =
  globalForPrisma.supportOpsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.supportOpsPrisma = db;
}
