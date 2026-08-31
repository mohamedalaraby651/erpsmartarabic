# Nazra — Execution Order Amendment: Frontend Platform (Track A) alongside PH1A (Track B)

## Verification first (done before this plan)

Read `PROJECT_MAP.md`, `README.md`, `docs/architecture/UX3A-ROADMAP.md`, and re-ran the
read-only audits. Current measured state (not assumed):

| Signal | Measured now |
|---|---|
| Import-layer violations (total) | 155 |
| `pages → repositories` | 11 |
| `components → repositories` | 41 |
| `components → services` | 5 |
| `hooks → supabase-client` | 31 |
| `components → supabase-client` | 38 |
| `pages → supabase-client` | 29 |
| `domain → ui` | 0 |
| Files still importing `@/components/ui-kit` | 3 |
| UI files importing the DB client directly (pages+components) | 68 |
| `check-ui-api-uniformity` (warn) | 42 components with issues |
| `check-design-system-inventory` (warn) | 635 findings, budget ∞ |
| `check-no-inline-styles` (warn) | 48 files |
| `check-no-any-in-ui` (warn) | 14 files |
| `check-component-loc-budget` (warn) | 2 over budget (sidebar 638, CustomerDetailsPage 855) |

Conclusion on the open question: **F1/F2 are genuinely still outstanding, but smaller than a
green-field project.** The residual is concentrated in `components/` and `hooks/`, not in
`pages/`. `pages → repositories` is already down to 11; the dominant remainder is 98
direct DB-client imports in UI/hooks plus 46 component→repository/service edges. F3–F6 are
consolidation work on an existing platform (ui-kit is effectively dead at 3 call sites,
theme registry exists, tokens v2 exist) — not a rewrite.

## Decision recorded by this amendment

1. `PH1A-NAZRA-001` / BND-05 stays **AUTHORIZED and FROZEN**. It is not reopened, not
   re-scoped, not paused. Track B continues to its own evidence pack and human review.
2. A second controlled track (Track A — Frontend Platform Hardening) runs alongside it,
   starting at F0, with its own scope, scope hash, baseline, evidence, and exit criteria.
3. Remaining Enterprise Boundaries (BND-01, BND-02, …) are **not** authorized until F1 and
   F2 are complete, so Finance/Inventory/Sync are built on the settled application layer.
4. Track A is Consolidation, never Rewrite. Any proposal to redesign the UI wholesale is an
   automatic STOP.

## Track structure

```text
TRACK A — Frontend Platform        TRACK B — Enterprise Boundaries
  F0 Baseline (measure only)         PH1A / BND-05 (frozen contract)
  F1 Architecture Completion               │
  F2 Application/Data Access               ▼
  F3 UI Platform                     BND-05 Evidence → Human Review
  F4 State & UX Architecture
  F5 Quality (a11y / RTL / perf)
  F6 Mobile / PWA / Offline UX
            └──────────── F1+F2 complete ────────────┐
                                                      ▼
                                           BND-01, BND-02, … → 8/8 → Enterprise Gate
```

Cross-track rule: no file may be mutated by both tracks in the same window. Track A must
not touch `src/domain/**`, `src/application/finance/**`, RLS, migrations, or any BND-05
scope item. Track B must not touch `src/ui/**` or `src/components/**`.

## F0 — Frontend Platform Baseline (first executable unit, measurement only)

Deliverables, no source mutation:

- `docs/governance/F0_FRONTEND_BASELINE.md` — snapshot ID `SNAPSHOT-F0-001` with the table
  above plus per-check detail for architecture, repositories/queries, UI API, design system,
  theme, state, a11y, RTL, performance, PWA.
- **Classification of the 155 violations** into four buckets, one row per violation with
  file, edge, and rationale: `legitimate exception` / `transitional` / `false positive` /
  `actual violation`. Only the last bucket becomes F1/F2 work.
- Performance budgets left **empty** in F0; numbers are proposed in F5 from measured data,
  never invented now.
- `docs/governance/F1_SCOPE_001.md` draft: candidate item list derived from the
  `actual violation` bucket, with a SHA-256 scope hash frozen only after human approval.

F0 stop condition: baseline + classification presented for review. No remediation starts
until the F1 scope hash is approved.

## F1 — Architecture Completion (after F0 approval)

Close only `actual violation` items: residual `pages → repositories`,
`components → repositories/services`, direct DB-client imports in `pages`/`components`,
and `hooks → supabase-client` where a query facade already exists. Method is the proven
Batch B pattern: thin application-layer facades + exact redirects, item-level scope
assertion via `scripts/audits/verify-item-scope.mjs`, no behaviour change. Target values
are set from the F0 classification, not from chasing 0.

## F2 — Application / Data Access Platform

Complete the `Repository → Query Service → Application Service → Presentation` chain so
pages consume an application API, not infrastructure. Includes: query-service coverage for
the remaining read paths, a documented application surface per module, and an enforcing
fitness check that bans new UI→infrastructure edges outright (replacing the allowlist).

## F3 — UI Platform

Flip `check-ui-api-uniformity` to enforcing after fixing the 42 flagged components; delete
the 3 remaining `ui-kit` call sites and remove the module; consolidate Forms, Tables,
Dialogs, Filters, Navigation, Empty/Error/Loading states on `src/ui/**`; RTL as a
first-class prop-level constraint, not a retrofit.

## F4 — State & UX Architecture

Document and enforce the hierarchy: server state → TanStack Query; application state →
context/services; local UI state → component; offline state → sync layer only. Fitness
check flags cross-category leaks.

## F5 — Quality Layer

Accessibility (keyboard, focus, semantics, contrast, SR behaviour), RTL sweep (typography,
spacing, icons, tables, forms, navigation, numbers, dates), and performance budgets
(bundle, LCP, INP, CLS, route load, query latency, render cost) — values chosen from F0/F5
measurements and then enforced.

## F6 — Mobile / PWA

Responsive → mobile UX → PWA → offline UX → sync UX, coordinated with the Offline/Sync
boundary semantics rather than a standalone UX layer.

## Governance applied to every F unit

Same contract already in force for Batch B and PH1A: declared scope → scope hash →
pre-mutation verification → mutation → post-mutation verification → evidence pack →
human review. No self-certification. Any drift outside the frozen item list is a STOP.
Documents to update on approval of this amendment: `docs/architecture/UX3A-ROADMAP.md`
(add Track A/B split), `docs/MASTER_PROJECT_REFERENCE.md` (execution order), and a new
ADR recording the reordering decision.

## What this plan executes first, on approval

Only **F0** — measurement, classification of the 155, and the F1 scope draft. Nothing else.
