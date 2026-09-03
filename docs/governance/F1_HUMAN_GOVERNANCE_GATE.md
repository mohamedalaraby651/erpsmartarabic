# F1 — Human Governance Gate Decision

**Decision ID:** `HRG-F1-NAZRA-001`
**Date:** 2026-09-03
**Authority:** Human governance review of `F1-C` machine evidence.
**Nature:** Gate decision — **PASS / ACCEPT**, **not** Certification.

---

## 1. Scope under review

| Item | Value |
|---|---|
| Frozen scope | `F1_SCOPE_001-R2` |
| Scope hash (SHA-256) | `e8ec2359fe4521967aba4d46f77711c047eb4bc4a58e3e0b36ea8db4723c7fe8` |
| Approved items | 37 (`F1-001` … `F1-037`) |
| F1-A (pages → repositories) | 4 |
| F1-B (components → repositories) | 33 |
| Machine evidence | `docs/governance/F1_CONSOLIDATED_VERIFICATION.md` |
| Machine evidence artifact | `scripts/audits/output/f1-verification.json` |
| Evidence artifact hash | `6d47790a6efc385e808ff2e4d8fccf8fa7edbd7ea69d8638e4f514bf2d1cf760` |

---

## 2. Governance verdict

| Axis | Verdict | Rationale |
|---|---|---|
| Frozen scope identity | ✅ PASS | 37/37 items present; hash reproduced unchanged. |
| F1-A / F1-B identity | ✅ PASS | 4 + 33 exactly as authorized. |
| Approved edge elimination | ✅ PASS | 37/37 edges eliminated by direct source inspection. |
| F1-approved residuals | ✅ PASS | 0/37 remaining. |
| Diff discipline | ✅ PASS | Import-only changes; 38 additions / 37 deletions per diff. |
| Facade purity | ✅ PASS | 23/23 facades are ADR-0028 pure re-exports with declared provenance. |
| New repository / query service | ✅ PASS | 0 created. |
| Architecture cycles | ✅ PASS | 6 total cycles unchanged (no regression). |
| UI cycles | ✅ PASS | 0 UI cycles unchanged. |
| Metric attribution | ✅ PASS | Violations 155 → 118 = −37, matching the 37 approved edges exactly; residual 15 honestly reported. |
| F2 contamination | ✅ PASS | F2 surfaces (pages/components → supabase-client) unchanged. |
| Protected boundaries | ✅ PASS | BND-05 / RLS / Finance / Domain untouched. |
| PRE-TS-001 discipline | ✅ PASS | Recurrence #11 recorded, not opportunistically fixed; project-owned typecheck remained 0. |
| Certification claim | ✅ PASS | Correctly **not** claimed by machine evidence. |

**Overall decision:**

```text
F1-C:              PASS — READY FOR HUMAN GOVERNANCE GATE
F1-A + F1-B:       VERIFIED through F1-C
F1 frozen scope:   EXHAUSTED 37/37
Scope drift:       NONE detected
Collateral change: NONE detected
Certification:       NOT GRANTED
Next step:         New frozen scope required before any further work
```

---

## 3. Explicitly accepted residual findings

The following 15 repository edges remain in the codebase and are **accepted as out-of-scope** for F1:

| # | Category | Count | Files |
|---|---|---:|---|
| 1 | `_base/mapRepoError` utility imports | 11 | `CategoryFormDialog.tsx`, `CreditNoteFormDialog.tsx`, `ExpenseCategoryFormDialog.tsx`, `ExpenseFormDialog.tsx`, `QuotationFormDialog.tsx`, `SupplierPaymentDialog.tsx`, `CashRegisterFormDialog.tsx`, `CashTransactionDialog.tsx`, `CategoriesPage.tsx`, `ExpenseCategoriesPage.tsx`, `ExpensesPage.tsx` |
| 2 | Type-only repository imports | 4 | `JournalEntriesPage.tsx`, `ApprovalsPage.tsx`, `InventoryPage.tsx`, `PaymentsPage.tsx` |

These residuals are **not** a justification to retroactively expand F1.

`F1 = 37/37 closed against its frozen scope.`

This is **not** equivalent to "architecture is now clean."

---

## 4. Explicit non-decisions

The following remain **unaffected** by this gate decision:

- **Residual 15 repository edges** — remain OUT OF SCOPE.
- **F2** (58 items: pages/components → supabase-client) — remains **UNAUTHORIZED**.
- **RISK-008** — remains **OPEN**.
- **PRE-TS-001** — remains **CONTAINED**, not closed.
- **RISK-007** — remains **OPEN / PLANNED**.
- **PRE-EXT-001** — remains **OPEN**.
- **BND-01 … BND-04, BND-06 … BND-08** — remain **NOT CERTIFIED / NOT AUTHORIZED**.
- **F3 … F6** (design system, state, a11y/RTL, performance, mobile/PWA) — remain **LOCKED**.
- **No feature freeze modification** is authorized.
- **No opportunistic cleanup** is authorized.

---

## 5. Governance outcome

```text
F1 execution:        ACCEPTED
F1 scope:            CLOSED
F1 status:           VERIFIED / PASS
Certification:       NOT GRANTED
Authorization chain: F0-NAZRA-001 → F1_SCOPE_001 → F1_SCOPE_001-R2 → F1-A → F1-B → F1-C → HRG-F1-NAZRA-001
```

Any further work must begin with a **new frozen scope**, a new human authorization, and its own evidence pack. The success of F1 does **not** implicitly authorize F2 or any other track.

---

## 6. Signatures

| Role | Verdict | Notes |
|---|---|---|
| Machine verification (F1-C) | PASS | `scripts/audits/output/f1-verification.json` |
| Human governance gate | PASS — ACCEPTED, NOT CERTIFIED | This document |

**Next authorized gate:** None until a new frozen scope and human authorization are issued.
