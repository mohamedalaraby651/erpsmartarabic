# ADR Registry

**Sole source of truth** for every architectural decision in this project. Every new or superseded ADR MUST be added/updated in the same PR.

## Conventions

- ADRs are numbered sequentially: `ADR-0000`, `ADR-0001`, …
- Status: `Proposed` | `Accepted` | `Superseded` | `Deprecated`.
- `Supersedes` column lists ADR ids superseded by this one (most recent → oldest).
- `Area` matches the touched module / primitive / contract.

## Index

| ADR | Status | Supersedes | Area | UX Phase | Date |
|---|---|---|---|---|---|
| [ADR-0000](./0000-architecture-frozen-before-frontend-rewrite.md) | Accepted | — | Architecture freeze before frontend rewrite | UX-0 | 2026-06-18 |
| [ADR-0002](./0002-ui-shell-layout-only.md) | Accepted | — | UI Shell as layout-only OS | UX-1B | 2026-06-19 |
| [ADR-0003](./0003-canonical-primitives-v1.md) | Accepted | — | Canonical Primitive System v1 | UX-1C | 2026-06-19 |
| [ADR-0004](./0004-composition-contracts-v1.md) | Accepted | — | Composition Contracts v1 | UX-1D | 2026-06-19 |
| [ADR-0005](./0005-integration-spike-protocol.md) | Accepted | — | Integration Spike Protocol (Architecture Quality Gate) | UX-1E | 2026-06-19 |
| [ADR-0006](./0006-temporal-model-and-clock-port.md) | Accepted | — | Temporal model: `Instant` VO + `ClockPort` single authority | UX-2 / Step 0 | 2026-06-19 |
| [ADR-0008](./0008-error-mapping-and-unit-of-work.md) | Accepted | — | Error model, `Result`, and Transaction Finality | UX-2 / Step 0 | 2026-06-19 |
| [ADR-0010](./0010-repository-failure-taxonomy.md) | Accepted | — | `RepositoryFailure` taxonomy + retryability classifier | UX-2 / Step 0 | 2026-06-19 |
| [ADR-0011](./0011-finance-domain-and-invoice-aggregate.md) | Accepted | — | Finance Domain Bounded Context + Invoice Aggregate Contract (Integer-only Money, explicit state machine, aggregate-enforced event ordering) | UX-2A | 2026-06-20 |
| [ADR-0012](./0012-infrastructure-adapter-and-event-sourcing.md) | Accepted | — | Infrastructure Adapter + Event-Sourced Persistence (Codec Registry, Rehydrator, `invoice_events` + RLS, Composition Root, sequence-only ordering, operational-only metadata) | UX-2B | 2026-06-30 |
| [ADR-0013](./0013-baseline-architecture-tags.md) | Accepted | — | Baseline Architecture Tags (immutable snapshots, `BASELINE-<PHASE>-<SEQ>`, composite SHA-256, separate from SemVer) | UX-2B → UX-2C | 2026-07-01 |

| [ADR-0031](./0031-enterprise-boundary-contract.md) | Accepted | — | Enterprise Boundary Contract as an operating standard (16-field catalog, Invariant→Fitness→Test→CI chain, no self-certification) | Phase 0 | 2026-08-29 |
| [ADR-0044](./0044-modular-monolith-and-service-extraction-conditions.md) | Accepted | — | Modular Monolith fixed; service extraction gated by 4 preconditions + 2 of 5 measurable triggers | Phase 0 | 2026-08-29 |

<!--
New entries append below this line. Keep the table sorted by ADR id ascending.
When an ADR is superseded:
  - Update its Status column to "Superseded by ADR-XXXX".
  - Add the new ADR row with the old id(s) in the Supersedes column.
-->
