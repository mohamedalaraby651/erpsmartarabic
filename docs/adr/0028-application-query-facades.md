# ADR-0028 — Application Query Facades (UX-3A Wave 2 · Sprint 3.1)

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** UX-3A Wave 2 Sprint 3.1 governance gate  
**Supersedes:** —  
**Superseded by:** —  
**Standardization target:** UX-3A Wave 2.5

## Context

Fitness scanner `scripts/audits/dep-graph.mjs` flags six critical layer-violation edges. Two of them cover the presentation → repository leak:

- `components → lib/repositories/*` (69 edges pre-Sprint 3.1)
- `pages → lib/repositories/*` (31 edges pre-Sprint 3.1)

The sanctioned path is `presentation → hooks → repositories → supabase-client`. The scanner explicitly permits `hooks → repositories` and `application → repositories`.

Sprint 3.1 Batch A (v3) must reduce these violations by ≥15% with **zero behavior change** and without creating ad-hoc facades under `src/hooks/**`.

## Decision

Introduce a dedicated **Application Query Facade** module at `src/application/queries/**`. Each facade is a pure `export *` re-export of a single `src/lib/repositories/*` module. UI code (pages/components) imports from the facade path only:

```ts
// Before
import { customerRepository } from "@/lib/repositories/customerRepository";
// After
import { customerRepository } from "@/application/queries/customers";
```

Facade creation is bound to the **Facade Creation Rule (Sprint 3.1 v3)**:

- Reused by ≥2 UI modules, **OR**
- Represents a stable public application contract, **OR**
- Planned in Wave 6.5 (Ports Taxonomy).

All four Batch A facades (`customers`, `suppliers`, `products`, `customer-search`) satisfy the first two conditions.

## Consequences

**Positive**
- Presentation layer no longer imports repositories directly — a canonical rule of the target architecture.
- Zero behavior change: facades are pure re-exports; type inference and runtime behavior identical.
- Provides the seam Wave 2.5 will standardize (typed application read-model contracts).

**Negative / Trade-offs**
- Adds an intermediate module; slightly increases module count (+5). Bundle size unaffected (tree-shaken).
- Requires discipline: any behavior added to a facade before Wave 2.5 standardization is a violation of this ADR.

## Standardization Roadmap (Wave 2.5)

Each facade will be replaced by an explicit typed contract (Application Query DTO + read function set). At that point:

1. Repository re-exports become internal.
2. The facade file exposes only the standardized contract.
3. `UI_API_V1.md` moves the entry from `Pending Standardization` to `Standardized`.

## Compliance Rules

- Facades under `src/application/queries/**` **MUST** remain pure re-exports until Wave 2.5.
- Facades **MUST NOT** import from `src/hooks/**`, `src/components/**`, `src/pages/**`, `src/ui/**`.
- New facades **MUST** be gated by the Facade Creation Rule and registered in `docs/architecture/UI_API_V1.md` with a `Pending Standardization` marker.
