# Changelog

This changelog records the `v1.0.0` source snapshot. The annotated tag is authorized; no GitHub Release, deployment, or production-readiness claim is part of this action.

## v1.0.0 — Source snapshot (2026-11-02)

### Added

- Tenant-scoped workspace identity and roles; customer/ticket operations, assignment, activity history, and distinct internal notes and customer-visible replies.
- Bounded plain-text knowledge ingestion, source-line citations, lexical search, and an insufficient-evidence path.
- Human-reviewed local triage suggestions with abstention and an auditable accept/override flow.
- Workspace metrics, tenant-scoped assignment/mention notifications, and owner/manager-only audit history.
- Multi-stage Docker builds for the Next.js web app and FastAPI intelligence service, with an opt-in loopback-bound Compose profile, migration/seed tasks, and health checks.
- CI checks for JavaScript and Python dependency advisories, full-history secret scanning, and container build/smoke verification.

### Changed

- Updated Vitest to the patched 4.x line and refreshed vulnerable transitive dependency resolutions for Prisma's `deepmerge-ts` and `minimatch`.
- Updated the Python lockfile to patched Starlette 1.10.0.
- Enabled Next.js standalone output and configured monorepo tracing for the web container.
- Refreshed project documentation after M4 and M5 merged.

### Verification

M5 passed main-branch CI run `41416709489` after PR #6 merged at `4c8d15c5c33b82e9eef7f1e8bc6bbacb287b8d34`. The run passed the full quality suite, JavaScript/Python dependency audits, full-history Gitleaks scan, Docker builds, and container smoke test. See the [release proposal](docs/RELEASE_PROPOSAL.md) for details and local-environment limitations.

### Not included

PDF/file uploads, email delivery, external model APIs, public deployment, production secret management, and verified production readiness remain out of scope. Seed data and Compose defaults are fictional and disposable.
