# SupportOps product requirements

**Status:** Requirements baseline · 2026-11-01. M0 and M1 are complete; M2 ticketing implementation is underway on a separate review branch. Requirements describe intended behavior unless explicitly identified as implemented in the README.

## Product outcome

SupportOps is a multi-tenant workspace for support teams to manage customer conversations, find source-backed help content, and review optional machine-generated routing suggestions. A suggestion is advisory: an authorized person decides whether to accept or override it. The product must make tenant boundaries, internal-only content, provenance, and uncertainty visible.

## Users and roles

| Role        | Intended permissions                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Owner**   | Manage workspace settings and membership/roles; access all workspace operations and audit history.                                                                 |
| **Manager** | Manage ticket operations and agents; access workspace reporting and audit history. Cannot transfer ownership or change owner privileges.                           |
| **Agent**   | Work assigned/available tickets, reply to customers, add internal notes, search knowledge, and review/override suggestions. No membership or audit administration. |

Membership is scoped to an organization. Every authenticated request resolves the active organization from the user's verified membership; a client-provided organization ID is only a selector, never proof of access. Users may belong to multiple workspaces and switch only among verified memberships.

## Core workflows

### Workspace and identity

1. Register/sign in using a maintained authentication library and secure, HTTP-only session cookies.
2. Create a workspace and become its owner, or accept a safe demo invitation to join one.
3. Switch among organizations for which the signed-in user has active membership.
4. Owners/managers invite members and assign only permitted roles. Demo invitations must not send unsolicited email or expose reusable public invitation secrets.

### Ticket operations

- Browse tickets with bounded pagination, status/priority/assignee filters, and search.
- Create and view tickets with customer, subject, description, priority, status, tags, assignee, timestamps, and optional SLA target.
- Add a customer-visible reply or a visually and semantically distinct internal note. Internal notes must never be returned by customer-facing endpoints or included in replies.
- Assign/reassign tickets, manage tags, and transition among `new`, `open`, `pending`, `resolved`, and `closed` with an explicit transition policy.
- Show a chronological activity timeline and an explicit overdue/SLA-risk state. Conflicting edits must be handled with version checks or server-authoritative updates; no silent optimistic overwrite.

### Knowledge and evidence

- Create text documents and, only after bounded validation is implemented, ingest supported text/PDF files.
- Index content as bounded excerpts retaining document identity and exact page or line provenance.
- Search within the active workspace and display the excerpt plus source citation. Results must never cross organization boundaries.
- Label the initial retrieval method accurately as lexical; scores are ranking signals, not probabilities or proof. Return “insufficient evidence” when no result clears a documented support threshold.
- Deleting a document removes or makes inaccessible all derived excerpts and search entries in the same authorized workflow.

### ML-assisted triage

- Suggest one of a small documented queue taxonomy (initially `billing`, `account`, `technical`, `sales`) or abstain for human review.
- Store suggestion, scores, model/version metadata, and review state separately from the ticket's human-selected queue or assignee.
- Apply a documented confidence/known-input gate. Low confidence, unsupported input, and service failure result in a neutral review state, not a guessed route.
- An authorized agent may accept or override. Preserve the original suggestion, human decision, actor, timestamp, and reason where provided in the audit trail.
- Do not describe model scores as calibrated likelihood or correctness without evaluation supporting that claim.

### Dashboard, notifications, and audit

- Show open tickets by status and priority, workload by agent, SLA-risk count, suggestion acceptance/override rate, and knowledge-search usage, with honest empty/loading/error states.
- Provide in-app assignment and mention notifications; never disclose cross-tenant content in notification payloads.
- Keep append-only-style audit events for sensitive actions. Audit access is owner/manager only and every query is tenant-scoped.

## Quality attributes and acceptance criteria

- **Tenant isolation:** every tenant-owned record is scoped by organization in service queries and mutations. Automated tests demonstrate that a user in organization A cannot read, mutate, infer, or cite organization B's records, including by guessing IDs.
- **Authorization:** centralized role and membership checks cover every API operation; UI hiding is not authorization.
- **Privacy:** session secrets stay server-side; logs exclude credentials and message/document bodies by default. No customer data or secrets are used in synthetic fixtures.
- **Accessibility:** keyboard-operable navigation and dialogs, visible focus, semantic labels, contrast, reduced-motion support, responsive behavior, and distinct labels for internal-only content.
- **Reliability:** state transitions and related audit records commit atomically. External intelligence-service failure degrades to manual triage/search error handling without losing ticket work.
- **Validation:** Zod validates TypeScript request boundaries; Pydantic validates Python service boundaries. Return generic client errors and structured, redacted server logs.
- **Upload safety:** if uploads are introduced, enforce byte/page/text bounds, allowlisted types, generated safe storage names, no execution, and cleanup of derived index data. Do not claim hostile-PDF safety without isolation and limits.
- **No paid dependencies in CI:** tests use local seeded PostgreSQL and deterministic local classifier/retrieval fixtures.

## Out of scope for the initial stable version

- Public production deployment or claims of production readiness.
- Autonomous ticket sending/routing or automatic customer-facing answers.
- LLM-generated responses, paid APIs, external model downloads, or model training on user tickets.
- Redis, queues, object storage, realtime collaboration, or large-corpus/vector infrastructure absent a measured requirement.
- Billing, email delivery, SSO, complex SLA calendars, OCR, and integrations with third-party help desks.
- Claims about real customers, real operational performance, benchmark generalization, or compliance certifications.

## Milestone acceptance checklist

- [x] **M0 — Product and architecture:** requirements, architecture diagram, threat model, architecture decision record, and this milestone checklist reviewed.
- [x] **M1 — Foundation:** installable monorepo; local PostgreSQL Compose; Prisma schema and migration; session auth, workspace membership, authorization; shared contracts; fictional seed data; lint/type/test/build CI. CI verification passed in run `41309229644`; see the M1 PR and session record.
- [ ] **M2 — Ticketing core (in progress):** persistent customer/ticket/message/note/assignment/tag/activity flows; tenant and role tests; responsive shell; login-to-resolve browser journey. Browser and migration verification must pass in CI before marking complete.
- [ ] **M3 — Knowledge and ML:** bounded ingestion; lexical evidence and exact citations; confidence-gated classifier; accept/override audit; API contract and failure tests; offline CI.
- [ ] **M4 — Analytics and polish:** dashboard metrics, notifications, restricted audit UI, accessibility and performance review, loading/error/empty states, screenshots/social preview, deployment guide and production-gap checklist.
- [ ] **M5 — Release candidate:** clean-checkout, migration, seed, Docker, unit/integration/browser/Python tests, dependency and secret scan, changelog and release proposal. Publishing `v1.0.0` requires explicit user approval.

A milestone is complete only when its exact verification commands have been run and recorded, limitations are stated, and the work is proposed in a reviewable pull request. Do not merge a PR without explicit user instruction.
