# Deployment guidance and production gaps

**Status:** Guidance only; no deployment has been performed. SupportOps is currently scoped for fictional, local/test data and is not approved for a public deployment or real customer data. Re-check this document against the release candidate and the chosen hosting environment before any exposure.

## Current local run

Follow the repository [README quick start](../README.md#local-quick-start). It uses Docker Compose for PostgreSQL, the Next.js web app, and the internal FastAPI intelligence service. Keep `.env` untracked, replace every placeholder locally, and use only fictional data. The example passwords and database credentials are disposable local seed values—not secrets suitable for a shared environment.

## Deployment planning checklist

A future deployment needs a deployment-specific threat and operations review. This checklist is intentionally provider-neutral; completing it is not, by itself, evidence that the application is production-ready.

### Hosting and network boundaries

- [ ] Decide supported environments, regions, data residency, availability objectives, and an accountable operator.
- [ ] Put the web app behind HTTPS with trusted proxy, host/origin, and secure-cookie settings explicitly configured and tested.
- [ ] Keep PostgreSQL on a private network and allow connections only from the web app and approved migration/backup jobs.
- [ ] Keep the intelligence service private to the web app network. Do not publish its private routes or bearer token to browsers, logs, or public ingress.
- [ ] Review the actual production start commands and health/readiness behavior for Next.js, FastAPI, PostgreSQL, and migrations.

### Identity, secrets, and abuse prevention

- [ ] Replace `BETTER_AUTH_SECRET`, `DATABASE_URL`, and `INTELLIGENCE_SERVICE_TOKEN` using the selected platform's secret manager; validate rotation and access policy.
- [ ] Do not reuse `.env.example`, local seed passwords, or development/demo users. Disable or redesign public registration until email verification, abuse controls, recovery, and an operational account lifecycle have been implemented and reviewed.
- [ ] Set and test the canonical Better Auth URL, trusted origins, proxy headers, cookie security, session expiration/revocation, password reset, and rate limits.
- [ ] Threat-model credential stuffing, tenant enumeration, CSRF, authorization bypass, denial of service, and secret leakage against the chosen ingress and deployment topology.

### Database and data lifecycle

- [ ] Run reviewed Prisma migrations as a controlled release step (`pnpm --filter @supportops/database prisma:deploy`); do not run development `migrate dev` against a shared database.
- [ ] Test restore from encrypted, access-controlled backups, including point-in-time recovery where required; document retention and deletion policies.
- [ ] Verify database connection limits, TLS, least-privilege roles, migration/backup credentials, pool behavior, and tenant isolation under the selected runtime.
- [ ] Define and test export, account deletion, workspace deletion, data retention, privacy notice, and incident-response procedures.
- [ ] Review audit-event retention and access; “append-only-style” application events are not a tamper-proof compliance log.

### Reliability, observability, and release operations

- [ ] Establish redacted logs, actionable metrics, alerts, error handling, and an on-call/incident escalation process. Never log credentials, bearer tokens, message bodies, internal notes, or source-document content by default.
- [ ] Validate resource limits and request/body limits at both the edge and application; assess concurrency and database query behavior with representative, synthetic data before setting capacity claims.
- [ ] Define dependency and OS-image patching, vulnerability triage, rollback, maintenance windows, and an SBOM or equivalent inventory process.
- [ ] Run the full release verification in [README](../README.md#verification), plus environment-specific smoke, backup/restore, security, and failure-mode tests.
- [ ] Obtain explicit approval before enabling paid services, processing real customer data, or making a public release.

## Known product gaps (not currently implemented or verified)

- Email verification, password recovery, outbound customer email, invitation delivery, and production account lifecycle.
- Production secret management, deployment automation, trusted-proxy/TLS configuration, private network policy, database backup/restore, monitoring, alerting, and incident response.
- Production rate limiting and abuse review beyond existing authentication-library controls; tenant-level quotas and operational capacity limits.
- Independent security review, privacy/legal review, data retention policy, compliance assessment, and tamper-resistant audit storage.
- No verified load, reliability, recovery, or real-customer evaluation is claimed. Do not describe the service as production-ready or deployed unless the specific evidence is recorded and reviewed.
