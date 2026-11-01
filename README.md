# SupportOps — AI-Assisted Customer Support Platform

[![CI](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml)

A multi-tenant support platform with session-based accounts, organization membership, server-side role checks, and a ticketing-core implementation underway. M2 adds tenant-scoped customer/ticket records, public replies, separate internal notes, assignments, tags, transitions, SLA state, activity history, and responsive queue/detail views. Knowledge retrieval, ML triage, analytics, and notifications remain future milestones.

> **Status:** M1 is merged; M2 is in progress on a separate review branch. No production deployment, real users/customers, benchmark performance, or production-readiness claim is made. Use only fictional data.

The CI badge links to the repository's workflow and is not a claim that this unmerged M2 branch has passed. No app screenshot is included yet.

## Architecture at a glance

Monorepo: Next.js App Router/React/TypeScript web app → Prisma-backed PostgreSQL for identity and workspace membership; a private FastAPI/Pydantic service is scaffolded for later local retrieval/classification work. Better Auth owns email/password authentication and database-backed sessions. The web app resolves each workspace membership server-side before returning workspace details. An organization ID alone never grants access.

See [architecture and data flow](docs/ARCHITECTURE.md), [product requirements](docs/PRODUCT_REQUIREMENTS.md), [threat model](docs/SECURITY.md), and [ADR 0001](docs/DECISIONS/0001-architecture.md).

## Local quick start

Requirements: Node.js 22+, Corepack/pnpm 10.28.2, Python 3.11+, `uv`, and Docker Compose.

```sh
cp .env.example .env
# Replace BETTER_AUTH_SECRET with a unique random value of at least 32 characters.
corepack enable pnpm
pnpm install --frozen-lockfile
docker compose -f infra/docker/compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. The fictional local seed accounts are `demo@supportops.example.invalid` / `SupportOps-Demo-2026!` (owner) and `agent@supportops.example.invalid` / `SupportOps-Agent-2026!` (agent), unless overridden in `.env`. The seed creates an `Acme Support Demo` workspace. These credentials are for local fictional data only; change them if you adapt the seed and do not reuse them outside a disposable local environment. Registration currently has no email verification or delivery service and is **not suitable for public production use**.

Start the Python service in a separate terminal:

```sh
cd services/intelligence
uv sync --locked --all-extras
uv run --locked uvicorn supportops_intelligence.main:app --host 0.0.0.0 --port 8001
```

Run its local tests/quality checks from `services/intelligence`:

```sh
uv run --locked pytest -q
uv run --locked ruff check .
uv run --locked ruff format --check .
```

The intelligence service currently exposes a liveness endpoint only; it does not classify tickets or retrieve knowledge yet.

## Implemented in M1 and the current M2 branch

- Monorepo workspace with locked pnpm and Python dependencies plus shared contracts, database, and accessible UI packages.
- Local PostgreSQL Compose service and Prisma migrations for identity, workspace membership, customers, tickets, messages, internal notes, assignment, tags, and activity history (M2 migration awaits CI validation).
- Better Auth email/password endpoints, database-backed sessions, HTTP-only/Lax cookies, configured request rate limiting, and sign-out.
- Organization creation that atomically makes the creator an owner; shared membership/role authorization helpers.
- Workspace shell that only displays an organization after the signed-in user’s membership is confirmed.
- Fictional local owner/agent seed accounts and workspace; FastAPI health endpoint.
- Ticket queue, create/detail views, public replies, distinct internal notes, role-gated assignment, tags, validated status transitions, SLA states, activity timeline, and bounded filtering/pagination.
- Unit/privacy tests and a Playwright login-to-resolve journey are authored; the M2 browser/database checks still need CI verification.

## Not implemented yet

Knowledge ingestion/search/citations, classifier and human override, expanded audit/notification workflows, and dashboard metrics remain future milestones. M2 ticket flows and a Playwright login-to-resolve journey are implemented in the current review branch but are not yet CI-verified. No real support data, external model, paid API, or remote image/font asset is used.

## Verification

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm --filter @supportops/database prisma:deploy
pnpm test
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
cd services/intelligence
uv sync --locked --all-extras
uv run --locked ruff format --check .
uv run --locked ruff check .
uv run --locked pytest -q
```

Database integration tests require a migrated local PostgreSQL database. CI uses a PostgreSQL service and local deterministic test data; it does not call paid APIs or download ML models. Local Prisma client generation and database verification are still pending in this environment because Docker/PostgreSQL is unavailable and Prisma's binary host is outside the sandbox's network allowlist. Do not interpret the commands above as a report that all of them have passed here.

## Security, limitations, and next milestone

No email verification, production secret management, deployment, uploads, or production monitoring is configured. The current registration flow is a local foundation only. Do not store customer data or expose this service publicly. Read the [security threat model](docs/SECURITY.md) for additional gaps and release requirements.

M1 is complete after its merged PR and CI run. M2 remains in progress until schema migration, tenant/privacy tests, type checks, build, and the login-to-resolve Playwright journey pass in CI. See the [milestone acceptance checklist](docs/PRODUCT_REQUIREMENTS.md). Milestones are proposed as separate reviewable PRs; do not merge without explicit user instruction.
