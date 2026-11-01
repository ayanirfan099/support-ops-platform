import { defineConfig, devices } from "@playwright/test";

const intelligenceToken =
  process.env.INTELLIGENCE_SERVICE_TOKEN ??
  "ci-only-intelligence-token-not-for-use-outside-automated-tests";

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command:
        "uv run --locked uvicorn supportops_intelligence.main:app --host 127.0.0.1 --port 8001",
      cwd: "services/intelligence",
      url: "http://127.0.0.1:8001/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { INTELLIGENCE_SERVICE_TOKEN: intelligenceToken },
    },
    {
      command: "pnpm --filter @supportops/web start",
      url: "http://localhost:3000/sign-in",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NODE_ENV: "production",
        DATABASE_URL:
          process.env.DATABASE_URL ??
          "postgresql://supportops:supportops-ci-only@127.0.0.1:5432/supportops?schema=public",
        BETTER_AUTH_SECRET:
          process.env.BETTER_AUTH_SECRET ??
          "ci-only-secret-not-for-use-outside-automated-tests-0001",
        BETTER_AUTH_URL: "http://localhost:3000",
        INTELLIGENCE_SERVICE_URL: "http://127.0.0.1:8001",
        INTELLIGENCE_SERVICE_TOKEN: intelligenceToken,
      },
    },
  ],
});
