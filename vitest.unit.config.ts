import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/contracts/src/**/*.test.ts",
      "apps/web/src/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/integration/**"],
    environment: "node",
  },
});
