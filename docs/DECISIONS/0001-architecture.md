# ADR 0001: Monorepo, PostgreSQL, and human-supervised intelligence boundary

- **Status:** Accepted for initial implementation planning
- **Date:** 2026-11-01
- **Decision owners:** SupportOps maintainers

## Context

SupportOps needs a reviewable first release that combines tenant-scoped support workflows, a responsive web application, a Python classification/retrieval service, durable relational data, and local/offline tests. The repository is currently a minimal README-only baseline. Related public projects provide useful design lessons but are separate repositories and are not dependencies. Avoiding premature infrastructure is important for understandable local development and reproducible CI.

## Decision

1. Use a monorepo with Next.js App Router + React + TypeScript for the application/UI, FastAPI + Pydantic for internal classification/retrieval APIs, PostgreSQL as the source of truth, and Prisma for schema/migrations/client.
2. Keep shared validation/contracts in a small TypeScript package and use Pydantic at the Python boundary. Keep web routes/domain services responsible for authentication, authorization, tenant scoping, and persistence.
3. Use a maintained session-based authentication library with HTTP-only cookies. Select a concrete library and establish its tested configuration during M1; do not hand-roll cryptography or session primitives.
4. Begin with deterministic local lexical evidence search and a small local classifier with explicit abstention. No paid APIs, model downloads, autonomous actions, or vector store are required for the first implementation.
5. Persist tenant-owned records with explicit organization scope. Verify membership and role in centralized server-side services on every operation. PostgreSQL RLS may be evaluated as defense-in-depth, but is not a substitute for service authorization and is not assumed until transaction/connection behavior is tested.
6. Use Docker Compose for local PostgreSQL and services. Do not add Redis, a message queue, object storage, or a vector database until a measured requirement justifies the operational cost.
7. Maintain one milestone per reviewable PR; never merge without explicit user instruction. Use documented milestone checklists until GitHub issues are intentionally created.

## Consequences

### Benefits

- One local setup and coherent changes across web, database, contracts, and Python service.
- PostgreSQL provides durable relational workflows and enforceable constraints without additional stateful infrastructure.
- Clear identity/data authority boundaries make tenant authorization reviewable.
- Offline deterministic tests are feasible; intelligence outages need not block essential ticket work.
- Lexical retrieval returns inspectable evidence without making unsupported semantic/LLM claims.

### Costs and risks

- Multiple runtimes require a documented toolchain and CI setup.
- Prisma and Python schemas need contract tests to prevent drift.
- Application-enforced tenant scoping is vulnerable to omissions unless every service and tenant-isolation test follows the same patterns; database-level defense-in-depth remains an open implementation decision.
- Lexical search misses synonyms/paraphrases; classifier scores may be uncalibrated and wrong. Human review and abstention remain essential.
- File upload and PDF parsing increase attack surface and are deferred until bounded validation/isolation is implemented.

## Related-project review and provenance

The following repositories were inspected on 2026-11-01 via their public GitHub metadata, root contents, and selected README/code:

- [`evidence-search`](https://github.com/ayanirfan099/evidence-search): its README describes BM25 + TF-IDF rank fusion, exact line citations, bounded UTF-8 input, no generated answers, and explicit score limitations. Reuse the *design principles* of line provenance, inspectable excerpts, and ranking-vs-certainty distinction. No source/data is copied.
- [`ticket-triage-classifier`](https://github.com/ayanirfan099/ticket-triage-classifier): its README and `model.py` describe a local TF-IDF/logistic-regression baseline, known-term/confidence abstention, train/test overlap checks, supporting terms, and caveats around uncalibrated scores and tiny synthetic data. Reuse the *review/abstention/evaluation principles* only. No source/data/model is copied.
- [`paper-evidence-retrieval`](https://github.com/ayanirfan099/paper-evidence-retrieval): its README describes page-aware citations, bounded PDF processing, local lexical/vector options, conservative evidence output, and fixture-vs-benchmark distinctions. Reuse the *provenance, bounds, and evidence/answer distinction* only. No source/data/model/artifact is copied.

There is no code or data reuse in M0. If implementation later reuses code, record its source, license, exact files/changes, and attribution before adding it.

## Alternatives considered

- **Separate repositories:** simpler independent release cycles but adds coordination and local integration friction for a small initial team; revisit if service ownership or deployment diverges.
- **Node-only application:** fewer runtimes, but the requested Python ML/retrieval boundary and existing Python expertise favor a narrowly scoped FastAPI service.
- **SQLite:** easier zero-service tests, but PostgreSQL is the target durable multi-tenant database and provides a closer development/CI model.
- **Vector retrieval/LLM from day one:** greater capability but additional model/data/operational uncertainty. Start with auditable lexical retrieval and revisit only with a representative evaluation and explicit product need.
- **Redis/queue/object store:** defer until async workloads, upload durability, or measured scaling requires them.

## Revisit when

Revisit this ADR if the service boundary causes unacceptable complexity, a representative search evaluation shows lexical retrieval is insufficient, uploads require durable object storage or isolated parsing, workload needs asynchronous processing, or verified production security requires database row-level policies.
