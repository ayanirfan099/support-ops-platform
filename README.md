# SupportOps — AI-Assisted Customer Support Platform

[![CI](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml)

A multi-tenant support platform foundation with session-based accounts, organization membership, and server-side role checks. The M1 implementation is in progress: **ticketing, knowledge retrieval, ML triage, analytics, and in-app notifications are not implemented yet.**

> **Status:** M1 foundation scaffold · 2026-11-01. No production deployment, real users/customers, benchmark performance, or production-readiness claim is made. Use only fictional data.

No app screenshot is included yet; it will be captured from the running application in a later milestone. The CI badge links to the repository's actual workflow; it does not imply that a run has already passed.

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

Open `http://localhost:3000`. The fictional local seed account is `demo@supportops.example.invalid` / `SupportOps-Demo-2026!` (unless overridden in `.env`). The seed creates an `Acme Support Demo` workspace. These credentials are for local fictional data only; change them if you adapt the seed and do not reuse them outside a disposable local environment. Registration currently has no email verification or delivery service and is **not suitable for public production use**.

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

## Implemented in the foundation

- Monorepo workspace with locked pnpm and Python dependencies plus shared contracts, database, and accessible UI packages.
- Local PostgreSQL Compose service and Prisma schema/initial migration for users, sessions, accounts, organizations, and memberships.
- Better Auth email/password endpoints, database-backed sessions, HTTP-only/Lax cookies, configured request rate limiting, and sign-out.
- Organization creation that atomically makes the creator an owner; shared membership/role authorization helpers.
- Workspace shell that only displays an organization after the signed-in user’s membership is confirmed.
- Synthetic local seed account/workspace; FastAPI health endpoint.
- Unit, PostgreSQL integration, auth/session integration test suites and GitHub Actions workflow authored for local CI. Integration tests require PostgreSQL.

## Not implemented yet

Ticket lifecycle/messages/internal notes/assignment/SLA, customer management, knowledge ingestion/search/citations, classifier and human override, audit/notification workflows, dashboard metrics, and Playwright journey remain future milestones. There are no actual ticket records or AI suggestions in this version. No real support data, external model, paid API, or remote image/font asset is used.

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
cd services/intelligence
uv sync --locked --all-extras
uv run --locked ruff format --check .
uv run --locked ruff check .
uv run --locked pytest -q
```

Database integration tests require a migrated local PostgreSQL database. CI uses a PostgreSQL service and local deterministic test data; it does not call paid APIs or download ML models. Local Prisma client generation and database verification are still pending in this environment because Docker/PostgreSQL is unavailable and Prisma's binary host is outside the sandbox's network allowlist. Do not interpret the commands above as a report that all of them have passed here.

## Security, limitations, and next milestone

No email verification, production secret management, deployment, uploads, or production monitoring is configured. The current registration flow is a local foundation only. Do not store customer data or expose this service publicly. Read the [security threat model](docs/SECURITY.md) for additional gaps and release requirements.

M1 is not marked complete until database migration, session/integration tests, type checks, and production build are verified in CI. M2 adds persistent ticket operations and a complete login-to-resolve Playwright journey. See the [milestone acceptance checklist](docs/PRODUCT_REQUIREMENTS.md). Milestones are proposed as separate reviewable PRs; do not merge without explicit user instruction.
