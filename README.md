# SupportOps — AI-Assisted Customer Support Platform

[![CI](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml)

A multi-tenant support platform with session-based accounts, organization membership, server-side role checks, and tenant-scoped ticket operations. M2's customer/ticket records, replies, separate internal notes, assignments, tags, transitions, SLA state, activity history, and responsive queue/detail views are merged. M3 is adding bounded plain-text knowledge search with line citations and optional human-reviewed local triage suggestions.

> **Status:** M1 and M2 are merged. M3 is in progress on a separate branch; its checks have not yet been run. No production deployment, real users/customers, benchmark performance, or production-readiness claim is made. Use only fictional data.

The CI badge links to the repository workflow, not to a claim that this in-progress M3 work has passed. No app screenshot is included yet.

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

The web app calls the internal intelligence service for document chunking, lexical search, and local triage. Replace the intelligence service-token placeholder in `.env` with a locally generated random token of at least 32 characters; do not commit `.env`. Start the service in a separate terminal:

```sh
cd services/intelligence
uv sync --locked --all-extras
uv run --locked uvicorn supportops_intelligence.main:app --env-file ../../.env --host 0.0.0.0 --port 8001
```

Run its local tests/quality checks from `services/intelligence`:

```sh
uv run --locked pytest -q
uv run --locked ruff check .
uv run --locked ruff format --check .
```

The service exposes a public liveness endpoint and private bearer-token-protected chunking, lexical-search, and classifier routes. The classifier and ranker are deterministic synthetic/local baselines, not benchmarked performance claims; the M3 verification status is listed below.

## Implemented in merged M1/M2 and in-progress M3

- Monorepo workspace with locked pnpm and Python dependencies plus shared contracts, database, and accessible UI packages.
- Local PostgreSQL Compose service and merged Prisma migrations for identity, workspace membership, customers, tickets, messages, internal notes, assignment, tags, and activity history.
- Better Auth email/password endpoints, database-backed sessions, HTTP-only/Lax cookies, configured request rate limiting, and sign-out.
- Organization creation that atomically makes the creator an owner; shared membership/role authorization helpers.
- Workspace shell that only displays an organization after the signed-in user’s membership is confirmed.
- Fictional local owner/agent seed accounts and workspace; bearer-token-protected FastAPI intelligence endpoints and a public liveness endpoint.
- Merged ticket queue, create/detail views, customer-visible replies, distinct internal notes, role-gated assignment, tags, validated status transitions, SLA states, activity timeline, and bounded filtering/pagination.
- M3 work in progress: bounded plain-text source ingestion (PDF/upload intentionally excluded), line-aware lexical search with source excerpts and insufficient-evidence state, and a local synthetic-fixture classifier that may abstain. Suggestions remain separate from the human-selected queue until an auditable human accept/override.
- The M2 browser/database journey passed CI before merge. M3 formatting, lint, 18 unit tests, and 12 Python tests pass locally; Prisma generation, database integration, web typecheck/build, and browser verification remain outstanding in this sandbox.

## Not implemented or not yet verified

The M3 implementation is still under development and must not be treated as verified until the listed checks run. PDFs and file uploads, dashboard analytics, notification workflows, and a restricted audit UI remain future milestones. M2 ticket flows and the Playwright login-to-resolve journey passed CI before PR #3 merged into `main` at `150c7f4`. No real support data, external model, paid API, or remote image/font asset is used.

## Verification

Run from the repository root:

```sh
pnpm install --frozen-lockfile
cd services/intelligence
uv sync --locked --all-extras
uv run --locked ruff format --check .
uv run --locked ruff check .
uv run --locked pytest -q
cd ../..
pnpm db:generate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm --filter @supportops/database prisma:deploy
pnpm db:seed
pnpm test
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Database integration tests require a migrated local PostgreSQL database. CI uses PostgreSQL and local deterministic test data; it does not call paid APIs or download ML models. In the current sandbox, Prisma client generation could not download its schema engine from the blocked binary host, and Docker/PostgreSQL are unavailable. Therefore the full web typecheck/build, database integration tests, and browser journey still require CI or a local environment with Prisma's engine and PostgreSQL. Do not interpret the command list above as a report that all checks have passed here.

## Security, limitations, and next milestone

No email verification, production secret management, deployment, uploads, or production monitoring is configured. The current registration flow is a local foundation only. Do not store customer data or expose this service publicly. Read the [security threat model](docs/SECURITY.md) for additional gaps and release requirements.

M1 and M2 are complete; M2 passed CI run `41312473904` before PR #3 merged into `main` at `150c7f4`. M3 remains in progress until the exact checks pass and a separate PR is proposed. See the [milestone acceptance checklist](docs/PRODUCT_REQUIREMENTS.md). Milestones are proposed as separate reviewable PRs; do not merge without explicit user instruction.
