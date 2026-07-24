# Sprint 3.1 · Batch A — Execution Record

**Sprint:** UX-3A Wave 2 · Sprint 3.1 · Batch A (v3 Governance-Hardened)  
**Date:** 2026-07-22  
**Owner Wave:** UX-3A Wave 2  
**Owner ADR:** 0028 (Application Query Facades)  
**Related:** `WAVE2_BATCH_2B_LEDGER.md`, `WAVE2_SPRINT3_BATCHA_DECISIONS.md`, `WAVE2_SPRINT3_BATCHA_COMPARISON.md`, `WAVE2_SPRINT3_BATCHA_GRAPH_DIFF.md`

## Summary

- **Fixed violations:** 32 critical (target ≥25).  
- **Strategy:** Introduce 4 application-layer read-model facades and redirect 30 UI files' direct repository imports to them (some files import >1 repo).  
- **Behavior change:** None (facades are pure `export *` re-exports).  
- **Verification:** `tsgo` green; `dep-graph.mjs` re-run shows critical 203 → 171.

## Files Created

- `src/application/queries/customers.ts`
- `src/application/queries/suppliers.ts`
- `src/application/queries/products.ts`
- `src/application/queries/customer-search.ts`
- `src/application/queries/index.ts`
- `docs/adr/0028-application-query-facades.md`
- `docs/architecture/WAVE2_SPRINT3_BATCHA_DECISIONS.md`
- `docs/architecture/WAVE2_SPRINT3_BATCHA_COMPARISON.md`
- `docs/architecture/WAVE2_SPRINT3_BATCHA_GRAPH_DIFF.md`
- `docs/architecture/WAVE2_SPRINT3_BATCHA.md` (this file)
- `scripts/fitness/check-public-surface-budget.mjs` (Report-only)
- `scripts/audits/output/wave2-sprint3-batchA.json`

## Files Modified (import redirect only)

30 UI files (see `WAVE2_SPRINT3_BATCHA_DECISIONS.md` for the full row-by-row table).

## Results

See `WAVE2_SPRINT3_BATCHA_COMPARISON.md` for the full Before/After table and Debt Burn-down Scorecard.  
Headline: **Critical -32 (-15.76%), Architecture Score 8.0 → 8.2, zero regression.**
