# Changelog

All notable SupportOps changes are recorded here. No versioned release has been published.

## Unreleased — M5 release-candidate preparation

### Added

- Multi-stage Docker builds for the Next.js web app and the FastAPI intelligence service.
- An opt-in `containerized` Compose profile with private service networking, local-only published ports, explicit migration/seed tasks, and health checks.
- CI verification for JavaScript and Python dependency advisories, full-history secret scanning with the MIT-licensed Gitleaks CLI, container image builds, and a local-stack HTTP smoke test. The Gitleaks configuration exempts only exact fictional fixture/build placeholders at their defined paths.
- A draft release proposal and a documented release gate; CI does not publish images, create tags, or create GitHub releases.

### Changed

- Updated Vitest to the patched 4.x line and refreshed vulnerable transitive dependency resolutions for Prisma's `deepmerge-ts` and `minimatch`.
- Updated the Python lockfile to patched Starlette 1.10.0.
- Enabled Next.js standalone output and configured monorepo tracing for the web container.
- Refreshed M4 documentation to reflect its merge in PR #5.

### Verification status

M5 verification remains in progress until the release-candidate CI workflow completes successfully. See [the release proposal](docs/RELEASE_PROPOSAL.md) for the exact verification record and known local-environment limits. This section is not a release announcement.

## Proposed v1.0.0 candidate scope (not released)

- Tenant-scoped workspace identity and roles; ticket/customer operations, assignment, activity history, internal notes, and customer-visible replies.
- Bounded plain-text knowledge ingestion with line-cited lexical search and an insufficient-evidence path.
- Human-reviewed, locally computed triage suggestions with abstention and an auditable accept/override flow.
- Workspace metrics, in-app assignment/mention notifications, and owner/manager-only audit history.
- Fictional local seed data, automated checks, and local/containerized verification only.

The candidate does not include PDF/file uploads, email delivery, external model APIs, a public deployment, production secret management, or verified production readiness. Any public version or deployment requires separate explicit approval.
