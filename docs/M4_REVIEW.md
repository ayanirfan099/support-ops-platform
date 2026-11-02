# M4 accessibility and performance review notes

**Review scope:** Static implementation review for the M4 dashboard, notification inbox, and restricted audit UI. This is not an accessibility audit, browser benchmark, load test, or production-readiness assessment. Playwright/CI verification is still pending.

## Accessibility review

- Workspace navigation has a programmatic label and exposes the current route with `aria-current="page"`; it remains visible and wraps on narrow screens rather than disappearing on mobile.
- Controls are native links/buttons/forms, keyboard focus has a visible outline, and reduced-motion preferences shorten animation/transitions.
- Workspace loading and request errors have accessible status/alert text. Empty metric, notification, and audit states use explanatory text rather than blank panels.
- Notification state is expressed with both “Read”/“Unread” text and a button label; failures are announced with `role="alert"`. Audit entries use a semantic ordered list and UTC `<time>` values.
- Audit history is exposed only to owners/managers in both the navigation/page and API authorization checks; UI hiding is not treated as the security boundary.

## Performance review

- Dashboard counts and groupings execute in parallel and are scoped by the verified organization. Supporting indexes cover tenant/status/SLA target, tenant/review status/review time, tenant/knowledge-search time, and current assignment lookup.
- Agent workload scans return at most 501 rows to detect truncation and display at most 500 assignments. This limit prevents an unbounded dashboard list; it is not a throughput claim.
- Notification and audit pages request 51 records to render 50 and expose a next cursor. Cursor anchors are validated inside the same tenant/recipient scope. Notification summaries do not include ticket body text.
- Audit queries return a minimal actor name and event summary/target, not event metadata, message bodies, or document content.

## Verification still required

Run the M4 Prisma migration, database integration tests, production build, and Playwright suite in CI. No Lighthouse/axe scan, representative-corpus query plan, load test, or measured performance benchmark is claimed. Any future capacity limit should be based on a representative synthetic workload and recorded query-plan review.
