# ADR-0000: Architecture Frozen Before Frontend Modernization

- **Status:** Accepted (UX-0)
- **Date:** 2026-06-19
- **Phase:** UX-0 Baseline Freeze

## Context

The system has 161 direct Supabase calls in UI, 111 `as any` casts, 44 `console.*` calls, and an unmeasured number of circular dependencies and oversized components. A previous POC (Phase A2.5) discovered a Shadow Repository in `SupplierRatingTab` (UI bypassing the repository layer). Continued growth without an evidence-driven plan risks an unrecoverable architectural drift.

## Decision

Before any structural modernization (UX-1 onward), execute UX-0 as a **pure measurement phase**:

- No changes to `src/**`.
- No migrations, edge functions, or runtime dependencies.
- Only audit scripts, JSON reports, Markdown summaries, governance docs, and a signed Git tag.

UX-1 may not begin until UX-0 reports are produced, deterministic, and signed off via `architecture-baseline-ux0` tag.

## Consequences

- **Positive:** Every subsequent phase has a verifiable baseline. Improvement claims become falsifiable.
- **Positive:** Decisions about UX-1 priorities (canonical primitives, POC table, lint rules) are made from evidence, not assumption.
- **Negative:** 1–2 days of effort produce no user-visible change.
- **Risk:** None to production — UX-0 changes 0 lines of `src/**`.

## References

- `docs/architecture/PRINCIPLES.md`
- `docs/architecture/KPIs.md`
- `docs/architecture/MANIFEST.json`
- `docs/risk-log/RISK-001-shadow-repository-regression.md`
- `docs/architecture/ARCHITECTURE_DECISIONS_Q1_Q6.md`
