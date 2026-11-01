# Security and privacy threat model

**Status:** Initial design review (M0/M1), 2026-11-01. The foundation configures Better Auth, HTTP-only/Lax session cookies, Zod validation for workspace creation, membership-scoped access helpers, and a PostgreSQL membership integration test. The rest of the controls below remain planned or unverified. This is not a security audit, certification, or production-readiness claim.

## Scope and assumptions

SupportOps is planned as a browser-based, multi-tenant support application. The browser is untrusted; request bodies, route parameters, headers, uploaded files, ticket content, document content, and classifier outputs are untrusted. PostgreSQL is the source of truth. The web server and internal intelligence service run in a controlled local/container environment for development. Future deployments must independently establish network isolation, TLS, secret management, backups, monitoring, patching, and incident response.

Initial version does not send mail, call paid AI APIs, download models in CI, or expose a public upload endpoint. Synthetic fixture data must be fictional. If these assumptions change, revisit this threat model before enabling the capability.

## Assets

- Session credentials, password hashes, and membership/role assignments.
- Tenant boundaries and organization-owned customer, ticket, message, note, tag, document, excerpt, and notification data.
- Confidential internal notes, customer-visible messages, and knowledge citations.
- Human triage decisions, classifier suggestions, model/version metadata, audit history.
- Database credentials, application secrets, and local test/seed configuration.

## Trust boundaries and actors

- **Unauthenticated internet/browser → web:** authentication, CSRF, request validation, abuse/rate limiting.
- **Signed-in user → tenant data:** membership and role checks on every server operation; identifiers are not capabilities.
- **Web → FastAPI:** internal, minimized, bounded payload; timeout and schema validation; service output is untrusted.
- **Uploaded/document text → parser/indexer/rendering:** potentially malformed or hostile content; no execution, safe rendering, strict limits.
- **CI/developer environment → repository:** prevent secrets, real customer data, unsafe artifacts, and unreviewed dependencies from entering Git.

Threat actors include unauthenticated attackers, authenticated low-privilege users, malicious insiders, compromised dependencies, and accidental operators. Tenant isolation is a primary security property, not a best-effort UI behavior.

## Principal threats and required mitigations

| Threat                                                 | Planned controls and verification                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-tenant IDOR, guessed IDs, or inferred records    | Resolve organization from verified membership; centralized authorization; scope every read/write/search by `organizationId`; non-enumerating errors; same-tenant relationship constraints; tests for guessed IDs, search, citations, notifications, and mutations.                                                                                                                                  |
| Privilege escalation or unsafe member invitations      | Role matrix enforced server-side; owner/manager-only member management; prohibit self-promotion and owner transfer via ordinary role changes; demo invite flow expires/consumes invites and does not reveal reusable secrets. Test forbidden role operations.                                                                                                                                       |
| Session theft/fixation or weak password handling       | Maintained authentication library; secure, HTTP-only, SameSite cookies and production-only Secure flag; rotate/invalidate sessions on auth/security changes; password hashing only through maintained library defaults; expiry and logout tests. Never log credentials or session tokens.                                                                                                           |
| CSRF and unsafe state changes                          | SameSite session cookies plus Better Auth trusted-origin checks and Next.js server-action protections; unsafe methods require same-origin protections; no state changes via GET; test cross-origin mutation rejection. Development additionally trusts the Arena `*.e2b.app` preview origin pattern for browser previews; that exception is disabled in production and must not be broadened there. |
| Brute force, enumeration, or resource exhaustion       | Generic auth errors; rate limits for authentication, search/AI, and uploads; bounded JSON bodies, page size, query length, timeouts and concurrency; safe limits configured for local/production modes.                                                                                                                                                                                             |
| Internal note disclosure                               | Separate note/public-message types and API serialization; customer-facing APIs select only public messages; explicit labels and access tests; notes excluded from notifications and logs by default.                                                                                                                                                                                                |
| Injection, unsafe Markdown/HTML, or stored XSS         | Parameterized ORM queries; validate request schemas; render Markdown as sanitized HTML or safe text; disable raw HTML; escape untrusted values; test stored hostile content.                                                                                                                                                                                                                        |
| Malicious or oversized documents/PDFs                  | Allowlist format and MIME/signature checks; byte/page/text bounds; generated storage names; safe parser versions; no execution; isolate CPU-heavy parsing; reject encrypted/unsupported files; remove derived chunks on deletion; test malformed and boundary files. Do not enable uploads until these controls exist.                                                                              |
| Unsupported or overconfident AI suggestion             | Local bounded classifier; confidence/known-input gate; abstain on weak score, unknown content, timeout, or invalid output; human review required; preserve original suggestion and override audit; clearly label scores as uncalibrated unless verified.                                                                                                                                            |
| Invalid/misleading citations or cross-tenant retrieval | Scope document/chunk selection by authorized organization; preserve exact provenance; verify cited chunk belongs to scoped document; render excerpt and source; return insufficient evidence on weak support; test provenance and deletion behavior.                                                                                                                                                |
| Secret leakage / sensitive logs                        | Commit only `.env.example` with safe placeholders; ignore local env files; secrets server-side; structured redacted logs with request correlation and no tokens/message/document bodies; secret scanning in CI before release.                                                                                                                                                                      |
| Audit tampering or sensitive audit exposure            | Append-only-style event API, transactionally written with sensitive state changes; no routine edit/delete endpoint; role-restricted tenant-scoped audit reads. This is not tamper-proof against DB administrators.                                                                                                                                                                                  |
| Dependency or CI supply-chain compromise               | Lockfiles, reviewed maintained dependencies, automated dependency/secret scans, least-privilege CI permissions, no paid services or remote model downloads in tests, and reproducible clean-checkout commands.                                                                                                                                                                                      |
| Tenant data in notifications/errors                    | Notification rows and reads scoped by tenant/membership; minimal payloads; generic client errors; structured server-side diagnostics without private bodies.                                                                                                                                                                                                                                        |

## Authorization invariants

1. A valid session is necessary but not sufficient: every tenant-owned operation checks active membership and the role required for that operation.
2. Never accept an organization ID from a client as authorization. If it is supplied as a workspace selector, verify membership before use.
3. Scope the primary resource and every joined/related resource to the same organization. Validate customer, assignee, tags, document, and ticket relationships before writes.
4. Apply authorization in server-side domain/service functions and test direct API calls; UI visibility is not a control.
5. Return non-enumerating responses for inaccessible resources. Do not distinguish “exists in another tenant” from “does not exist.”
6. Automated tests must use at least two organizations and assert denied reads, mutations, search results, citations, notifications, and audit access.

## Secure development and incident boundaries

Use local/test configuration by default. `.env.example` values must be safe placeholders and unusable as production credentials. Do not introduce real customer or credential material in fixtures, screenshots, issue text, or logs. If a secret is committed, rotate/revoke it first; removing it from the latest tree alone is insufficient. No production-readiness or compliance claim is permitted without a separate verified review.

Before any public deployment, conduct a deployment-specific review covering TLS and trusted proxy settings, secure cookie configuration, secret store, database access/network policy, backups/restore, monitoring and redaction, dependency patching, rate limits, retention/deletion, privacy notice, incident handling, and upload isolation. These are known production gaps until implemented and verified.
