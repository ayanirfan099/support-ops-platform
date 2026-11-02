# Release proposal — SupportOps v1.0.0

- **State:** Draft only — not approved, tagged, published, or deployed.
- **Milestone:** M5 release-candidate verification.
- **Proposed scope:** Candidate implementation from M1–M4, with M5 verification and dependency/security fixes.
- **Approval gate:** Explicit user approval is required before creating any `v1.0.0` tag or GitHub release. This proposal is not that approval.

## Summary

SupportOps is a multi-tenant support workspace with ticket operations, source-backed knowledge, and human-reviewed routing suggestions. The proposed candidate consolidates M1–M4 features and M5 release checks. It is intended only for review and fictional/local evaluation at this stage; the proposal makes no production-readiness, deployment, customer, or performance claim.

## Candidate contents

- Workspace membership and role checks, customer/ticket records, assignment, activity history, and separate internal notes and customer-visible replies.
- Bounded plain-text knowledge ingestion, lexical search with exact line citations, and an explicit insufficient-evidence state.
- Local synthetic-fixture triage suggestions with abstention; human accept/override remains explicit and auditable.
- Workspace metrics, tenant-scoped in-app notifications, and owner/manager-only audit history.
- A hybrid local developer setup and an opt-in containerized local Compose profile; no public deployment automation.
- JavaScript/Python dependency scans, full-history secret scanning, and container smoke verification in CI.

## Release gates

1. Complete the M5 acceptance checklist in [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md), including clean-checkout CI, Prisma generation/migrations, repeatable seed, unit/integration/browser/Python tests, both dependency audits, secret scanning, Docker builds, and container smoke test.
2. Review and merge the M5 pull request through the normal review process. Do not merge it as part of preparing this proposal.
3. Record the final CI run, all local checks actually run, and limitations below. A failed or unavailable check remains open; do not call it passed.
4. Obtain explicit user approval before creating a tag or publishing a GitHub release. CI is intentionally verification-only and does not publish artifacts.
5. Treat production exposure, real customer data, and paid-service configuration as separate decisions requiring a deployment-specific security/operations review and explicit approval.

## Verification record

### Local checks

- JavaScript clean-lockfile install (`pnpm install --frozen-lockfile`): passed.
- JavaScript formatting (`pnpm format:check`): passed.
- JavaScript lint (`pnpm lint`): passed.
- JavaScript unit tests (`pnpm test`): passed, 20 tests across 6 files.
- JavaScript dependency audit (`pnpm audit --audit-level low`): passed, no known vulnerabilities.
- Python lock sync (`uv sync --locked --all-extras`), tests (`uv run --locked pytest`), Ruff formatting/lint (`uv run --locked ruff format --check .` and `uv run --locked ruff check .`), and dependency audit (`pip-audit` against all locked runtime and development extras): passed; 12 tests and no known Python dependency vulnerabilities. Pytest reported one Starlette TestClient deprecation warning; no tests failed.
- Local Prisma generation, database migration/seed, full web typecheck/build, database integration tests, browser journeys, Docker builds, Compose startup, and Gitleaks execution: not verified in this sandbox. Docker/PostgreSQL are unavailable; Prisma's schema-engine download is blocked by the sandbox network; GitHub release-asset download for the local Gitleaks binary is also blocked. CI must provide those results.

### CI checks

M5 workflow result: **passed** — GitHub Actions run `41413820169` completed successfully for PR #6 head `ffcbedbd218c2a7d17eadfff8996c2035d9d3f9e`. All three jobs passed: `quality` (Prisma generation/migrations, seed-twice, formatting/lint/typecheck, unit/integration tests, web build, Playwright, Python formatting/lint/tests); `Dependency and secret scans` (JavaScript audit, Python audit of locked runtime/development extras, full-history Gitleaks scan); and `Container build and smoke test` (Compose validation, web/intelligence image builds, container migrations/seed, health checks, and HTTP smoke test). PR #6 remains open and unmerged; this CI result is not a release approval.

### Known limitations

- No production environment, real users/customers, benchmark, load test, independent security audit, or accessibility certification has been verified.
- Email verification/delivery, password recovery, public-registration controls, file uploads/PDF/OCR, external AI providers, production secrets, backups, monitoring, incident response, and deployment operations remain incomplete or out of scope.
- Local seed credentials and Compose defaults are fictional and disposable; they are not suitable for shared or public environments.

## Publication decision

No release artifacts have been created. After the gates above, ask for approval before taking any publication action. If approval is not granted, keep the version unreleased and this proposal in draft state.
