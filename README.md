# SupportOps — AI-Assisted Customer Support Platform

[![CI](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ayanirfan099/support-ops-platform/actions/workflows/ci.yml)

A multi-tenant support workspace for ticket operations, source-backed knowledge, and human-reviewed routing. M1–M4 are merged, including ticket/customer records, separate internal notes and public replies, knowledge citations, advisory triage, live workspace metrics, tenant-scoped notifications, and a role-restricted audit history. M5 release-candidate verification passed CI; PR #6 is open for review. No version has been published.

> **Status:** M4 PR #5 merged at `c5db31021d99ac4101cccd5361589757c1c293a6` after complete CI run `41409133762` passed. M5 CI run `41413820169` passed all jobs; PR #6 is open and unmerged. No production deployment, real users/customers, benchmark performance, or production-readiness claim is made. Use only fictional data. Publishing `v1.0.0` requires explicit approval.

The CI badge shows workflow status; it does not imply a release exists or that every M5 verification has passed. A branded social preview graphic is included; its dashboard values are labeled as illustrative sample values, not actual usage.

## Architecture at a glance

Monorepo: Next.js App Router/React/TypeScript web app → Prisma-backed PostgreSQL for identity and workspace data, with a private FastAPI/Pydantic service for bounded local retrieval and triage. Better Auth owns email/password authentication and database-backed sessions. The web app resolves each workspace membership server-side before returning workspace details. An organization ID alone never grants access.

See [architecture and data flow](docs/ARCHITECTURE.md), [product requirements](docs/PRODUCT_REQUIREMENTS.md), [threat model](docs/SECURITY.md), [deployment guidance and known production gaps](docs/DEPLOYMENT.md), [M4 review notes](docs/M4_REVIEW.md), the [changelog](CHANGELOG.md), the [draft release proposal](docs/RELEASE_PROPOSAL.md), and [ADR 0001](docs/DECISIONS/0001-architecture.md).

## Local quick start

Requirements: Node.js 22+, Corepack/pnpm 10.28.2, Python 3.11+, `uv`, and Docker Compose.

```sh
cp .env.example .env
# Replace BETTER_AUTH_SECRET and INTELLIGENCE_SERVICE_TOKEN with unique random values of at least 32 characters.
corepack enable pnpm
pnpm install --frozen-lockfile
docker compose -f infra/docker/compose.yml up -d postgres
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

### Run the full local stack in containers

The optional `containerized` Compose profile builds the web and intelligence images in addition to PostgreSQL. It binds web and database ports to loopback only. Set both secrets in `.env` first, then:

```sh
docker compose -f infra/docker/compose.yml --profile containerized up --build -d postgres intelligence
docker compose -f infra/docker/compose.yml --profile containerized run --rm migrate
docker compose -f infra/docker/compose.yml --profile containerized run --rm seed
docker compose -f infra/docker/compose.yml --profile containerized up --build -d web
```

Open `http://localhost:3000`. The app and intelligence service remain on Compose's private network; only the local web and database ports are published. This profile uses local/demo defaults and is not a production deployment recipe. Stop containers with `docker compose -f infra/docker/compose.yml --profile containerized down` (omit `--volumes` to retain the local database).

The service exposes a public liveness endpoint and private bearer-token-protected chunking, lexical-search, and classifier routes. The classifier and ranker are deterministic synthetic/local baselines, not benchmarked performance claims; the M3 verification status is listed below.

## Implemented in merged M1–M4

- Monorepo workspace with locked pnpm and Python dependencies plus shared contracts, database, and accessible UI packages.
- Local PostgreSQL Compose service and merged Prisma migrations for identity, workspace membership, customers, tickets, messages, internal notes, assignment, tags, and activity history.
- Better Auth email/password endpoints, database-backed sessions, HTTP-only/Lax cookies, configured request rate limiting, and sign-out.
- Organization creation that atomically makes the creator an owner; shared membership/role authorization helpers.
- Workspace shell that only displays an organization after the signed-in user’s membership is confirmed.
- Fictional local owner/agent seed accounts and workspace; bearer-token-protected FastAPI intelligence endpoints and a public liveness endpoint.
- Merged ticket queue, create/detail views, customer-visible replies, distinct internal notes, role-gated assignment, tags, validated status transitions, SLA states, activity timeline, and bounded filtering/pagination.
- M3 merged in PR #4: bounded plain-text source ingestion (PDF/upload intentionally excluded), line-aware lexical search with source excerpts and insufficient-evidence state, and a local synthetic-fixture classifier that may abstain. Suggestions remain separate from the human-selected queue until an auditable human accept/override.
- M2 passed CI before merge. M3's complete CI suite passed in run `41320612182`, including Prisma generation/migrations, formatting/lint/typecheck, seed-twice, unit/integration tests, web build, Playwright browser journeys, and Python checks; PR #4 merged at `8fa20f8`.

## M4 implemented in merged PR #5

- Workspace dashboard aggregates active/status/priority/queue counts, active agent workload (capped at 500 assignments), past-target active tickets, and 7-day ticket, triage-review, and knowledge-search measures.
- Assignment and `@email` mention notices are tenant-membership scoped, stored with minimal summaries, and displayed in a per-member inbox. Recognized member handles are replaced in customer-visible replies so teammate email addresses are not exposed there.
- Owner/manager-only audit history and API, with tenant-scoped event queries; event metadata omits message and document bodies.
- M4 migration adds notification and audit tables plus dashboard indexes. Loading/error/empty states, keyboard/mobile/reduced-motion styling, an illustrative social preview, and deployment planning are included; full M4 CI run `41409133762` passed.

## Not implemented or not yet verified

M4's complete CI suite passed in run `41409133762`; PR #5 is merged. M5's full CI run `41413820169` passed the quality, dependency/secret scan, and container build/smoke jobs; PR #6 is open for review and remains unmerged. PDFs and file uploads, email delivery, external models, and public deployment remain out of scope. No real support data, external model, paid API, or remote font/image asset is used.

## Verification

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm audit --audit-level low
cd services/intelligence
uv sync --locked --all-extras
uv run --locked ruff format --check .
uv run --locked ruff check .
uv run --locked pytest -q
uv export --locked --all-extras --no-emit-project --format requirements-txt --output-file /tmp/supportops-requirements.txt
uvx --from pip-audit==2.10.1 pip-audit --requirement /tmp/supportops-requirements.txt
cd ../..
pnpm db:generate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm --filter @supportops/database prisma:deploy
pnpm db:seed
pnpm db:seed
pnpm test
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
# The security workflow installs Gitleaks CLI v8.30.1 and scans full Git history.
# It also builds and starts the opt-in containerized Compose profile, then smoke-tests /sign-in.
```

Database integration tests require a migrated PostgreSQL database. CI uses fictional local fixtures and does not call paid APIs or download ML models. M5 local verification passed frozen pnpm installation, Prettier, ESLint, 20 JavaScript unit tests, a zero-finding JavaScript audit, 12 Python tests, Ruff format/lint checks, and a Python dependency audit with no known vulnerabilities. M5 CI run `41413820169` passed the complete quality suite (including migrations/seed, integration and browser tests), both dependency audits, full-history secret scan, Docker image builds, and container smoke test. In this sandbox, Docker and PostgreSQL are unavailable and Prisma client generation cannot download the schema engine; therefore local migrations/seed, full web typecheck/build, database integration/browser tests, Docker smoke tests, and Gitleaks execution were not verified here. See the [release proposal](docs/RELEASE_PROPOSAL.md) for the full record. Do not interpret the command list as saying every check passed locally.

## Security, limitations, and next milestone

No email verification, production secret management, deployment, uploads, or production monitoring is configured. The current registration flow is a local foundation only. Do not store customer data or expose this service publicly. Read the [security threat model](docs/SECURITY.md) for additional gaps and release requirements.

M1–M4 are complete; M4 merged in PR #5 at `c5db31021d99ac4101cccd5361589757c1c293a6` after CI run `41409133762` passed. M5 verification passed in CI run `41413820169`; PR #6 is open and unmerged. See the [milestone acceptance checklist](docs/PRODUCT_REQUIREMENTS.md), [changelog](CHANGELOG.md), and [draft release proposal](docs/RELEASE_PROPOSAL.md). No tag or release has been created; publishing `v1.0.0` requires explicit approval. Milestones remain separate reviewable PRs and must not be merged without explicit user instruction.
