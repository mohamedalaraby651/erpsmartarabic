# PHASE 1A AUTHORIZATION CONTRACT — Tenant Isolation

- **Contract ID:** `PH1A-NAZRA-001`
- **State:** **TEMPLATE — UNSIGNED · NOT AUTHORIZED**
- **Precondition record:** `HRD-NAZRA-001` (Human Review Decision Pack)
- **Blocking:** decisions **D-2 … D-5** are PENDING. Until all four are settled and this contract is
  explicitly signed by the human authority, **no Phase 1A implementation may begin.**
- **Certification:** NOT GRANTED · Boundaries **0 / 8** · Smart Freeze **ACTIVE**

> This file exists so that Phase 1A, when authorized, starts from a closed scope rather than from a
> narrative. Its presence is **not** authorization. An agent may not sign it, may not infer
> authorization from it, and may not pre-implement against it.

## 1. Pending inputs (must be filled by the human review, not by the agent)

| Input | Source decision | Value |
|---|---|---|
| RISK-007 in scope? | D-2 | _pending_ |
| RISK-008 required treatment | D-3 | _pending_ |
| PRE-TS-001 residual-risk acceptance + owner | D-4 | _pending_ |
| `BASELINE-UX4-001` sealing criteria | D-5 | _pending_ |

## 2. Contract fields to be locked at signature

| Field | Requirement |
|---|---|
| Boundary under work | BND-05 Tenant → Data (primary); BND-01 interaction to be stated explicitly |
| Approved file scope | Exhaustive file list, frozen |
| Approved Scope Hash | SHA-256 over the frozen list, computed before implementation |
| Item-level scope | Required wherever a file is only partially in scope |
| Forbidden surfaces | Named explicitly (e.g. ledger posting, payment, stock movement, sync semantics) |
| Tooling constraint | Phase 1A must **not** depend on `scripts/fixes/**` mutating in-scope boundaries (RISK-008) |
| Target metrics | Stated as measurable exit numbers, not adjectives |
| Evidence set | Enumerated commands + expected artifacts |
| STOP policy | Any scope drift halts execution and produces a STOP report |
| Certification claim | Prohibited — certification is granted only at Boundary Review |

## 3. Execution chain after signature

```text
PHASE 1A AUTHORIZATION (signed)
        ↓
Tenant Isolation implementation (frozen scope only)
        ↓
Evidence regeneration (Baseline + Delta + Evidence)
        ↓
G0-class evidence integrity check
        ↓
Human Boundary Review
        ↓
BND-01 / BND-05 Certification decision
        ↓
Phase 1B (Authorization / PDP) — separately authorized
```

## 4. Standing prohibitions during Phase 1A

- No opportunistic lint remediation (see `LINT_CLASSIFICATION.md`).
- No security remediation unless D-2 places RISK-007 explicitly in scope.
- No agent self-certification, in any form or wording.
- No lifting of Smart Freeze for any domain not certified against its boundary exit criteria.
