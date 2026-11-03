# Deployment guidance and production gaps

**Status:** guidance only. SupportOps has not been publicly deployed and is approved only for fictional local/CI data. The included Dockerfiles and Compose profile describe executable process boundaries for verification; they are not a complete production platform manifest.

## Actual runtime topology

A deployment must preserve these boundaries:

1. **Next.js web application**
   - only browser-facing application;
   - owns sessions, tenant authorization, APIs and database writes;
   - requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `INTELLIGENCE_SERVICE_URL` and `INTELLIGENCE_SERVICE_TOKEN`.
2. **PostgreSQL**
   - private source of truth;
   - reachable only by the web application and controlled migration/backup jobs;
   - requires encrypted connections, least-privilege roles, backups and restore testing.
3. **FastAPI intelligence service**
   - private network only;
   - public `/health` liveness endpoint contains no tenant data;
   - private routes require the shared service token;
   - never expose its bearer token or private routes to browser code.
4. **One-shot migration job**
   - runs reviewed Prisma migrations before new web instances receive traffic;
   - uses `prisma migrate deploy`, never `migrate dev`.
5. **Optional seed job**
   - local or ephemeral fictional demos only;
   - must not run automatically in a real environment.

## Local verification topology

Follow the [README quick start](../README.md#local-quick-start) for locally run services and PostgreSQL, or use the optional Compose profile:

    docker compose -f infra/docker/compose.yml       --profile containerized up --build -d postgres intelligence
    docker compose -f infra/docker/compose.yml       --profile containerized run --rm migrate
    docker compose -f infra/docker/compose.yml       --profile containerized run --rm seed
    docker compose -f infra/docker/compose.yml       --profile containerized up --build -d web

The profile binds web and PostgreSQL ports to loopback. It uses disposable defaults and is not a production recipe.

## Controlled release runbook

Before deployment:

1. Select a reviewed commit with green CI.
2. Provision private PostgreSQL and a private network path to the intelligence service.
3. Generate unique auth and intelligence secrets in the platform secret manager.
4. Set the exact canonical HTTPS `BETTER_AUTH_URL`.
5. configure trusted origins, proxy/IP handling and secure-cookie behavior for the real ingress.
6. Build immutable web and intelligence images from the reviewed commit.
7. Back up the database and verify a rollback point.
8. Run:

   pnpm --filter @supportops/database prisma:deploy

9. Start the intelligence service and require a successful `/health` response.
10. Start the web service and require a successful `/sign-in` smoke request.
11. Run environment-specific authentication, tenant-isolation and failure-mode smoke tests.
12. Route traffic only after migrations and health checks succeed.

Rollback must use the previous reviewed application image and a migration-compatible database state. Prisma migrations in this repository are forward migrations; destructive rollback is not automated.

## Health and readiness boundaries

- PostgreSQL: `pg_isready` verifies connection acceptance, not schema correctness.
- Intelligence: `/health` verifies process liveness, not web-to-service authorization or model quality.
- Web: `/sign-in` verifies HTTP liveness, not database migrations, private-service access or full readiness.
- CI separately applies migrations, seeds fictional data and runs browser journeys.

A hosting platform should not treat any single liveness check as proof that the complete product is ready. Add environment-specific readiness checks and alerts before shared exposure.

## Public demo gate

Do not expose the current build anonymously. A future portfolio demo must satisfy every item below:

- [ ] Use only fictional, resettable data in a dedicated environment.
- [ ] Disable public sign-up at both UI and API boundaries, or implement verified email, abuse prevention, recovery and account lifecycle controls.
- [ ] Replace all local seed credentials and prevent the seed job from running during normal startup.
- [ ] Restrict demo access through an allowlist, temporary access gateway or individually issued demo accounts.
- [ ] Automatically reset or expire demo data on a documented schedule.
- [ ] Configure HTTPS, canonical origins, secure cookies and trusted proxies.
- [ ] Configure Better Auth client-IP handling for the selected ingress; do not accept arbitrary spoofable forwarding headers.
- [ ] Add edge and application rate limits for authentication, knowledge search and triage.
- [ ] Enforce request/body limits. File uploads remain disabled.
- [ ] Redact logs and ensure messages, notes, documents, passwords, sessions and tokens are not logged.
- [ ] Monitor availability, errors, rate-limit events and database capacity.
- [ ] Define retention and deletion for accounts, tickets, knowledge, audit history and backups.
- [ ] Verify backup restoration and document incident ownership.
- [ ] Add a visible disclaimer that the environment contains fictional data and is not customer support.

## Secrets and network checklist

- [ ] Store `BETTER_AUTH_SECRET`, `DATABASE_URL` and `INTELLIGENCE_SERVICE_TOKEN` in the platform secret manager.
- [ ] Rotate secrets without exposing values in CI output, screenshots or repository files.
- [ ] Restrict PostgreSQL and intelligence-service ingress to approved runtime identities/networks.
- [ ] Require TLS to managed PostgreSQL and validate certificates.
- [ ] Keep migration and backup credentials separate from ordinary runtime permissions where supported.
- [ ] Validate session expiry, revocation, password reset and cookie behavior behind the real proxy.
- [ ] Never reuse `.env.example`, CI placeholders or fictional seed passwords.

## Data and operations checklist

- [ ] Define supported regions, residency requirements, availability objectives and accountable operators.
- [ ] Test encrypted backups, point-in-time recovery where available, and restore procedures.
- [ ] Set connection limits, pooling, query timeouts and resource limits using representative synthetic data.
- [ ] Define export, deletion, retention, privacy notice and incident-response procedures.
- [ ] Treat application audit events as operational history, not tamper-proof compliance records.
- [ ] Establish dependency/OS-image patching, vulnerability triage and rollback procedures.
- [ ] Review an SBOM or equivalent dependency inventory for each release.
- [ ] Run full CI plus environment-specific smoke, backup/restore and failure-mode tests.

## Known product and production gaps

- Public registration controls, email verification, password recovery and outbound email
- Production secret rotation and trusted-proxy configuration
- Managed deployment automation and environment-specific readiness
- Backup/restore, monitoring, alerting and incident response
- Tenant quotas and rate limits beyond the authentication-library baseline
- Independent security, privacy/legal and accessibility review
- Verified load, reliability, recovery or real-customer evaluation
- File uploads, PDF/OCR and external model providers

Do not describe SupportOps as deployed or production-ready until the chosen environment has independently satisfied and recorded these controls.
