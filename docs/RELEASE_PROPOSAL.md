# Release proposal — SupportOps v1.0.0 source tag

- **State:** The user explicitly authorized an annotated `v1.0.0` source tag.
- **Tag scope:** Source snapshot only; no GitHub Release, deployment, or production-readiness claim is part of this action.
- **Tag target:** The reviewed `main` commit after this release-record update is merged.
- **Milestone:** M5 release-candidate verification, complete and merged in PR #6.

## Summary

SupportOps is a multi-tenant support workspace with ticket operations, source-backed knowledge, and human-reviewed routing suggestions. M1–M5 and their verification are complete. The tag identifies a source snapshot for review and fictional/local evaluation; it does not represent production approval.

## Included scope

- Workspace membership and role checks, customer/ticket records, assignment, activity history, and separate internal notes and customer-visible replies.
- Bounded plain-text knowledge ingestion, lexical search with exact line citations, and an explicit insufficient-evidence state.
- Local synthetic-fixture triage suggestions with abstention; human accept/override remains explicit and auditable.
- Workspace metrics, tenant-scoped in-app notifications, and owner/manager-only audit history.
- Hybrid local developer setup and an opt-in containerized local Compose profile.
- JavaScript/Python dependency audits, full-history secret scanning, and container smoke verification in CI.

## Verification record

### CI

Main-branch CI run `41416709489` completed successfully for merge commit `4c8d15c5c33b82e9eef7f1e8bc6bbacb287b8d34` (PR #6). All jobs passed:

- `quality`: Prisma generation and migrations, seed-twice, formatting/lint/typecheck, unit/integration tests, web build, Playwright, and Python formatting/lint/tests.
- `Dependency and secret scans`: JavaScript audit, Python audit of locked runtime and development extras, and full-history Gitleaks scan.
- `Container build and smoke test`: Compose validation, web/intelligence image builds, migrations and seed, health checks, and HTTP smoke test.

### Local checks

- JavaScript: frozen pnpm install, formatting, lint, 20 unit tests, and dependency audit — passed with no known vulnerabilities.
- Python: locked sync, Ruff format/lint, 12 tests, and `pip-audit` against all locked extras — passed with no known vulnerabilities. Pytest emitted one Starlette TestClient deprecation warning; no tests failed.
- Workflow/Compose YAML, Gitleaks TOML, and `git diff --check` — passed.
- Local Prisma generation/migrations/seed, web typecheck/build, database integration/browser tests, Docker smoke, and Gitleaks execution were not available in this sandbox. Docker/PostgreSQL are unavailable and the Prisma schema-engine download is blocked; CI verified these checks.

## Limits and non-claims

- No production environment, real users/customers, benchmark, load test, independent security audit, or accessibility certification has been verified.
- Email verification/delivery, password recovery, public-registration controls, file uploads/PDF/OCR, external AI providers, production secrets, backups, monitoring, incident response, and deployment operations remain incomplete or out of scope.
- Local seed credentials and Compose defaults are fictional and disposable; they are not suitable for shared or public environments.

## Publication boundary

Create the annotated `v1.0.0` tag on the reviewed main commit after this documentation update merges. Do **not** create a GitHub Release or deploy the service as part of this action. Any production exposure, real customer data, or paid-service configuration needs separate review and explicit approval.
