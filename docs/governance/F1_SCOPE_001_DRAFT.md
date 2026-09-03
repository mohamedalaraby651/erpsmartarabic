# F1_SCOPE_001 — DRAFT (NOT FROZEN, NOT AUTHORIZED)

- **Status:** DRAFT proposal produced by F0. **No scope hash. No freeze. No execution.**
- **Predecessor evidence:** `docs/governance/F0_FRONTEND_BASELINE.md`, `scripts/audits/output/f0-frontend-baseline.json`
- **Nature:** Consolidation only. Never a rewrite.

Freezing this scope (assigning `F1-SCOPE-HASH`) requires a separate human authorization, exactly as `BATCHB-SCOPE-001` and `PH1A-NAZRA-001` were handled.

---

## 1. Proposed F1 objective

Close the **structural** portion of the 95 `ACTUAL_VIOLATION` rows and neutralize the 44 `TRANSITIONAL` rows by creating the missing seams — without changing UI behaviour, visual design, or business logic.

F1 is architecture only. Data-access migration volume belongs to **F2**.

---

## 2. Proposed F1 work items (draft)

| ID | Item | Source rows | Type |
|---|---|---:|---|
| F1-1 | Extract repository shared types/utilities out of `lib/repositories/_base.ts` into a contract module importable by UI | 11 TRANSITIONAL | structural |
| F1-2 | Register the 6 `LEGITIMATE_EXCEPTION` rows (auth ×3, realtime ×2, storage ×1) in `EXCEPTION_REGISTER.md` with rationale and review date | 6 | governance |
| F1-3 | Manually verify the 6 "no call site detected" `FALSE_POSITIVE` rows and either confirm or reclassify them | 6 | verification |
| F1-4 | Remove the 4 type-only rows from the violation rule by making the rule type-aware in `dep-graph.mjs` | 4 | tooling |
| F1-5 | Define the application command facade for the 5 `components → services` rows (design + ADR, no migration) | 5 | design |
| F1-6 | Resolve the 4 non-finance cycles (PDF ×3, dashboard/prefetch ×2 chains) | 6 cycles → 4 targets | structural |
| F1-7 | Retire the last 2 `@/components/ui-kit` call sites | 2 | consolidation |
| F1-8 | Author ADR for the query-service coverage model (44 repositories, 2 services, 12 facades) that F2 will execute against | — | design |

Explicitly **out of F1**: the 95 actual data-access redirects (F2), design-system consolidation (F3), state migration (F4), quality/performance/a11y/RTL work (F5), mobile/PWA (F6).

---

## 3. Explicitly excluded from F1

- Finance domain cycle (`domain/finance/invoice/*`) — frozen domain.
- PRE-EXT-001 (`pg_trgm` / `find_duplicate_customers`) — OPEN, out of Track A.
- RISK-007, RISK-008 — remain OPEN.
- PRE-TS-001 — remains CONTAINED; no reopening.
- PH1B and BND-01…BND-04 / BND-06…BND-08 — NOT AUTHORIZED.
- Any UI redesign or visual change.

---

## 4. Proposed exit criteria (for later human approval)

1. Every F1 item traced to specific rows in the F0 appendix.
2. Typecheck 0, fitness failures 0, Vitest green at or above 1619 passing.
3. Re-run `f0-frontend-baseline.mjs`; every changed classification appears as a documented delta, never a silent edit.
4. No violation converted by weakening a rule, except F1-4, which is an explicit, reviewed tooling change.
5. Evidence pack + human review before F2.

---

## 5. Required gate before F1 starts

```
F0 evidence
     ↓
Human Review
     ↓
F1 scope declared + frozen (hash)
     ↓
F1 execution under RISK-008 Control Gate
```

Nothing in this draft constitutes authorization.
