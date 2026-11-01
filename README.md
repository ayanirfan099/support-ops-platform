# SupportOps — AI-Assisted Customer Support Platform

SupportOps is planned as a multi-tenant support workspace for persistent ticket operations, source-backed knowledge search, and human-reviewed ML routing suggestions. **This repository currently contains the M0 product and architecture plan only; the application, database, CI workflow, and screenshots are not implemented yet.**

> **Status:** M0 planning baseline · 2026-11-01. No production deployment, real users/customers, benchmark performance, or production-readiness claim is made.

There is no CI badge or product screenshot yet: a real badge will be added with the first verified workflow, and screenshots will be captured from the implemented application rather than fabricated.

## Architecture at a glance

Planned monorepo: Next.js App Router/React/TypeScript web app → Prisma-backed PostgreSQL for tenant-scoped workflows; a private FastAPI/Pydantic service provides bounded local lexical evidence retrieval and confidence-gated triage suggestions. The web application owns sessions, authorization, tenant selection, persistence, and human decisions. Suggestions are advisory; weak or unavailable results fall back to human review.

See [architecture and data flow](docs/ARCHITECTURE.md), [product requirements](docs/PRODUCT_REQUIREMENTS.md), [threat model](docs/SECURITY.md), and [ADR 0001](docs/DECISIONS/0001-architecture.md).

## Current quick start

There is no runnable app yet. M0 verification is documentation-only:

```sh
git status --short
find docs -maxdepth 2 -type f -print
```

M1 will add the lockfile-based install commands, Docker Compose PostgreSQL startup, migration, and seed instructions. **No demo credentials exist yet.** Future demo accounts will contain fictional data and be documented only after the seeded authentication flow is implemented.

## Planned capabilities

- Tenant workspaces, membership, owner/manager/agent authorization.
- Ticket lifecycle, customer-visible replies, distinct internal notes, assignment, tags, activity, and SLA risk.
- Bounded knowledge documents with lexical evidence search and exact line/page provenance.
- Local triage suggestions with confidence gating, abstention, human accept/override, and audit history.
- Operational metrics, in-app notifications, and role-restricted audit views.

All are requirements, not current capabilities. The delivery checklist is in [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md).

## Limitations and boundaries

No application code, persistent schema, migrations, tests, CI, authentication, or deployment is present in this M0 baseline. The initial plan explicitly excludes autonomous customer replies, paid AI APIs, unverified accuracy claims, and premature Redis/object-storage/vector infrastructure. Do not use this repository for customer data until the relevant controls are implemented and reviewed.

## Verification

At this stage, only the documentation files can be reviewed. There are no application test commands to claim as passing. Future CI must install from lockfiles and run formatting/lint, type checking, unit/integration tests, Python tests, and production builds without paid or network-dependent model services.

## Milestones

- [x] **M0 — Product and architecture:** requirements, architecture diagram, security threat model, ADR, documented milestone checklist.
- [ ] **M1 — Foundation:** monorepo, local PostgreSQL, Prisma schema/migration, auth and memberships, contracts, fictional seed, CI.
- [ ] **M2 — Ticketing core:** persistent workflows, tenant-isolation tests, responsive shell, end-to-end journey.
- [ ] **M3 — Knowledge and ML:** safe ingestion, evidence/citations, confidence-gated classifier, human review/audit.
- [ ] **M4 — Analytics and polish:** metrics, notifications, audit UI, accessibility, screenshots, deployment-gap guide.
- [ ] **M5 — Release candidate:** clean-checkout verification and release proposal; publishing a version requires explicit approval.

Each milestone should be proposed as a separate reviewable PR and must not be merged without explicit instruction. See the detailed acceptance gates in [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md).
