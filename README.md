# SupportOps — AI-Assisted Customer Support Platform

[![CI](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml)

A multi-tenant support workspace for ticket operations, source-backed knowledge, and human-reviewed routing. M1–M3 are merged, including ticket/customer records, separate internal notes and public replies, knowledge citations, and advisory triage. M4 is adding live workspace metrics, tenant-scoped assignment/mention notifications, and a role-restricted audit history.

> **Status:** M1–M3 are merged; M3 passed complete CI run `41320612182` and PR #4 merged at `8fa20f8`. M4 is in progress on its milestone branch; its final CI and PR status will be recorded once verified. No production deployment, real users/customers, benchmark performance, or production-readiness claim is made. Use only fictional data.

The CI badge links to the repository workflow and does not imply that in-progress M4 has passed. A branded social preview graphic is included; its dashboard values are labeled as illustrative sample values, not actual usage.

## Architecture at a glance

Monorepo: Next.js App Router/React/TypeScript web app → Prisma-backed PostgreSQL for identity and workspace data, with a private FastAPI/Pydantic service for bounded local retrieval and triage. Better Auth owns email/password authentication and database-backed sessions. The web app resolves each workspace membership server-side before returning workspace details. An organization ID alone never grants access.

See [architecture and data flow](docs/ARCHITECTURE.md), [product requirements](docs/PRODUCT_REQUIREMENTS.md), [threat model](docs/SECURITY.md), [deployment guidance and known production gaps](docs/DEPLOYMENT.md), the [M4 review notes](docs/M4_REVIEW.md), and [ADR 0001](docs/DECISIONS/0001-architecture.md).

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

## Implemented in merged M1–M3

- Monorepo workspace with locked pnpm and Python dependencies plus shared contracts, database, and accessible UI packages.
- Local PostgreSQL Compose service and merged Prisma migrations for identity, workspace membership, customers, tickets, messages, internal notes, assignment, tags, and activity history.
- Better Auth email/password endpoints, database-backed sessions, HTTP-only/Lax cookies, configured request rate limiting, and sign-out.
- Organization creation that atomically makes the creator an owner; shared membership/role authorization helpers.
- Workspace shell that only displays an organization after the signed-in user’s membership is confirmed.
- Fictional local owner/agent seed accounts and workspace; bearer-token-protected FastAPI intelligence endpoints and a public liveness endpoint.
- Merged ticket queue, create/detail views, customer-visible replies, distinct internal notes, role-gated assignment, tags, validated status transitions, SLA states, activity timeline, and bounded filtering/pagination.
- M3 merged in PR #4: bounded plain-text source ingestion (PDF/upload intentionally excluded), line-aware lexical search with source excerpts and insufficient-evidence state, and a local synthetic-fixture classifier that may abstain. Suggestions remain separate from the human-selected queue until an auditable human accept/override.
- M2 passed CI before merge. M3's complete CI suite passed in run `41320612182`, including Prisma generation/migrations, formatting/lint/typecheck, seed-twice, unit/integration tests, web build, Playwright browser journeys, and Python checks; PR #4 merged at `8fa20f8`.

## M4 in progress (not yet CI-verified)

- Workspace dashboard aggregates active/status/priority/queue counts, active agent workload (capped at 500 assignments), past-target active tickets, and 7-day ticket, triage-review, and knowledge-search measures.
- Assignment and `@email` mention notices are tenant-membership scoped, stored with minimal summaries, and displayed in a per-member inbox. Recognized member handles are replaced in customer-visible replies so teammate email addresses are not exposed there.
- Owner/manager-only audit history and API, with tenant-scoped event queries; event metadata omits message and document bodies.
- M4 migration adds notification and audit tables plus dashboard indexes. Loading/error/empty states, keyboard/mobile/reduced-motion styling, an illustrative social preview, and deployment planning are in progress; final CI and browser verification are pending.

## Not implemented or not yet verified

M4 has not yet passed its complete CI suite or merged; its deployment guide and PR will be updated with verified results. M5 release-candidate work remains. PDFs and file uploads, email delivery, external models, and public deployment remain out of scope. M2 ticket flows and the Playwright login-to-resolve journey passed CI before PR #3 merged into `main` at `150c7f4`. No real support data, external model, paid API, or remote font/image asset is used.

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

Database integration tests require a migrated local PostgreSQL database. CI uses PostgreSQL and deterministic local fixtures; it does not call paid APIs or download ML models. In this sandbox, M4's local `pnpm format:check`, `pnpm lint`, and 20 unit tests passed, and its migration parsed as 16 PostgreSQL statements. Prisma client generation could not download the schema engine from the blocked binary host, and Docker/PostgreSQL are unavailable, so M4's schema generation, web typecheck/build, database integration tests, and browser journeys await CI. M3's complete CI suite passed in run `41320612182`; the M4 PR checks are pending. Do not interpret the command list as saying every check passed locally.

## Security, limitations, and next milestone

No email verification, production secret management, deployment, uploads, or production monitoring is configured. The current registration flow is a local foundation only. Do not store customer data or expose this service publicly. Read the [security threat model](docs/SECURITY.md) for additional gaps and release requirements.

M1–M3 are complete; M3 passed CI run `41320612182` before PR #4 merged into `main` at `8fa20f8`. M4 is in progress on its own branch and awaits PR CI. See the [milestone acceptance checklist](docs/PRODUCT_REQUIREMENTS.md). Milestones are proposed as separate reviewable PRs; do not merge without explicit user instruction.
