# SupportOps product requirements

**Status:** Requirements baseline · 2026-11-02. M0–M4 are complete; M4 merged in PR #5 at `c5db31021d99ac4101cccd5361589757c1c293a6` after full CI run `41409133762` passed. M5 acceptance verification passed in CI run `41413820169`; PR #6 is open and unmerged. Requirements describe intended behavior unless explicitly identified as verified in the README.

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

- For M3, create bounded plain-text documents only. PDFs, file uploads, OCR, and external connectors are explicitly out of scope until separately threat-reviewed.
- Index content as bounded excerpts retaining document identity and exact source-line provenance.
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
- [x] **M2 — Ticketing core:** persistent customer/ticket/message/note/assignment/tag/activity flows; tenant and role tests; responsive shell; login-to-resolve browser journey. CI run `41312473904` passed formatting, lint, type checks, PostgreSQL migrations, seed-twice, unit/integration tests, production build, Playwright journey, and Python checks. PR #3 merged to `main` at `150c7f4a802464d52dee32bba3a0c3f8063aef1d`.
- [x] **M3 — Knowledge and ML:** bounded plain-text ingestion (no PDF/upload); lexical evidence with exact source-line citations and insufficient-evidence behavior; synthetic local classifier with abstention; persistent suggestions separate from human-selected queue; auditable accept/override. Complete CI run `41320612182` passed formatting, lint, typechecks, Prisma generation/migrations, seed-twice, unit/database integration tests, web build, Playwright browser journeys, and Python checks. Merged in PR #4 at `8fa20f8`.
- [x] **M4 — Analytics and polish:** workspace/queue/status/priority/agent workload metrics; 7-day created/resolved, SLA-target, triage-review and knowledge-search measures; in-app assignment and `@email` mention notifications; owner/manager-only audit UI/API; keyboard/mobile/reduced-motion review; loading/error/empty states; branded sample-labeled social preview; deployment guidance and production-gap checklist. Tenant-scoped counts, capped workload, integration and browser journeys passed CI run `41409133762`. Merged in PR #5 at `c5db31021d99ac4101cccd5361589757c1c293a6`.
- [x] **M5 — Release candidate verification:** clean-checkout, Prisma generation/migrations, repeatable seed, Docker image build/health/smoke, unit/integration/browser/Python tests, JavaScript and Python dependency audits, full-history secret scan, changelog, and release proposal passed CI run `41413820169`. PR #6 is open and unmerged. Publishing `v1.0.0` requires explicit user approval; no tag or release is authorized by this checklist.

A milestone is complete only when its exact verification commands have been run and recorded, limitations are stated, and the work is proposed in a reviewable pull request. Do not merge a PR without explicit user instruction.
