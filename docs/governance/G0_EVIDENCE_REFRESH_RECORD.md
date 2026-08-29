# G0 — EVIDENCE REFRESH RECORD

- **Evidence ID:** `G0R-NAZRA-002`
- **Snapshot ID:** `SNAPSHOT-20260829-001`
- **Gate:** G0 — Evidence Refresh (integrity only)
- **Mode:** Baseline + Delta + Evidence. **No full re-analysis.** No Material Change Trigger fired.
- **Parent baseline:** `BASELINE-NAZRA-002` (SEALED) · **Parent records:** `G0-NAZRA-001` (PASS), `PHASE0-NAZRA-001` (COMPLETE), `PXC-NAZRA-001` (CLOSED)
- **Successor baseline:** `BASELINE-UX4-001` — **DRAFT / NOT SEALED**
- **Git commit:** `fb311a1e9df5b5377a8fd6c008d67cd4ef1ca1a5`
- **Generated at:** 2026-08-29T11:47Z · Node v22.22.0
- **Machine-readable:** `scripts/audits/output/g0-evidence-refresh.json`
- **Decision:** **PASS — evidence integrity only.** Certification **NOT GRANTED**. Phase 1 **NOT AUTHORIZED**.

## 1. Scope of this refresh

Only evidence that became stale after `PXC-NAZRA-001` was regenerated. Evidence that cannot
change without touching sealed artifacts is carried as a **lineage reference**, explicitly
*not* re-presented as a new result.

| Class | Items |
|---|---|
| REGENERATED (10) | typecheck contract, raw typecheck, build, lint, tests, fitness, dependency graph, inventory, baseline integrity, item-level scope |
| LINEAGE REFERENCE (2) | Batch B scope hash `eab102bd…`, architecture fingerprint `d22b6e09…` |

## 2. Fresh evidence

| ID | Check | Command | Result |
|---|---|---|---|
| EV-01 | Typecheck contract | `node scripts/audits/typecheck-app.mjs` | **PASS** — total 0 · platform 0 · project 0 |
| EV-02 | Raw strict typecheck | `npx tsgo -p tsconfig.app.json --noEmit` | exit 2 → **exit 0** after preflight (see §4) |
| EV-03 | Build | `npx vite build` | **exit 0** (chunk-size warnings only) |
| EV-04 | Lint | `npm run lint` | exit 1 — **37 errors / 865 warnings**, all classified |
| EV-05 | Tests | `bunx vitest run` | **exit 0** — 1592 passed · 5 skipped · 157 files passed / 1 skipped |
| EV-06 | Fitness | `node scripts/fitness/run-all.mjs` | **exit 0** — active 32 · pending 9 · failures 0 |
| EV-07 | Dependency graph | `node scripts/audits/dep-graph.mjs` | **exit 0** — 1210 modules · 4789 edges · 6 cycles · **UI cycles 0** · **155 violations** · **pages→repositories 11** |
| EV-08 | Inventory | `node scripts/audits/codebase-inventory.mjs` | **exit 0** — modules 174 · files 1210 · layers 20 · surfaces 9 |
| EV-09 | Baseline integrity | `check-baseline-tag-integrity.mjs` | **exit 0** — NAZRA-002 ok (28 entries) + 3 prior baselines ok |
| EV-10 | Item-level scope | `SCOPE_BASE=a33f49b9 verify-item-scope.mjs` | **MATCH** — authorized change only in `ExpensesPage.tsx` |

### Integrity hashes

```text
package.json        22df4faa92a3ef5ec99f7db637ca2ec31df8c378d80d9536223b16d548e13681
package-lock.json   36702e53833f5c91936509d182fa2426a14429a99145bd0b44dddc88456793b0
bun.lockb           57954bd8ba6493ea7d74faa1381295829ff33ed882e78e1a7bf9166fa2530203
dist (aggregate)    c6347c83937955515bca4904235038fae5a1b8fc645b667ee20fed1560505684
baseline composite  1b4fafd5d784c0b28daa3fb25653368adc11745b38e5523852b563d4e24cdf87  (unchanged)
scope hash          eab102bd71ccd916f5cf32284d27d0b03ed32008b0849b18687740f7fa32eb84  (unchanged)
```

Dependency lock hashes are **byte-identical to `G0-NAZRA-001`** — no dependency drift since the
sealed baseline. The `dist` aggregate differs from G0-NAZRA-001 (`4db9cb55…`) because the PDF
remediation of `PXC-NAZRA-001` changed emitted PDF render code; that is the expected, authorized
delta and no other source of build divergence exists.

## 3. Delta report (BASELINE-NAZRA-002 → PXC delta → fresh evidence)

| Metric | NAZRA-002 | after PXC | now | Δ vs PXC |
|---|---:|---:|---:|---|
| Typecheck (project-owned) | n/a | 0 | **0** | unchanged |
| Raw typecheck | exit 0 (post-preflight) | exit 0 | **exit 0** (post-preflight #7) | recurrence, contained |
| Build | 0 | 0 | **0** | unchanged |
| Lint errors | 39 | 37 | **37** | unchanged |
| Lint warnings | 865 | 865 | **865** | unchanged |
| Tests passed | 1581 | 1592 | **1592** | unchanged |
| Failing test files | 3 | 0 | **0** | unchanged |
| Fitness | 32 / 9 / 0 | 32 / 9 / 0 | **32 / 9 / 0** | unchanged |
| Modules / cycles / UI cycles | 1210 / 6 / 0 | 1210 / 6 / 0 | **1210 / 6 / 0** | unchanged |
| Layer violations | 155 | 155 | **155** | unchanged |
| `pages → repositories` | 11 | 11 | **11** | unchanged |
| Boundaries certified | 0/8 | 0/8 | **0/8** | unchanged |

Violation shape (unchanged): `components→repositories` 41 · `components→supabase-client` 38 ·
`hooks→supabase-client` 31 · `pages→supabase-client` 29 · `pages→repositories` 11 ·
`components→services` 5 · `domain→ui` 0.

Architecture metrics are unchanged **by design**: no architecture code was touched by PXC or by
this refresh.

## 4. PRE-TS-001 — recurrence #7 observed during this refresh

At refresh start the raw typecheck failed again with the same two `TS7011` diagnostics: the
platform regenerated `src/integrations/supabase/previewAuthStorage.ts` and dropped the annotation.

Two things are recorded, and they must not be collapsed into one:

```text
Project-owned contract   → held.  typecheck-app.mjs reported project = 0 throughout.
Platform-owned artifact  → drifted again. Recurrence #7.
```

The corrected diagnosis from `PXC-NAZRA-001` §2 was confirmed empirically: the compiler points at
the **inner callback**, and the annotation that actually resolves it is
`.then((): void => undefined)`. That annotation was re-applied as an **isolated preflight
micro-change** — zero scope-hash impact, zero architecture impact, no baseline lineage impact.
`PRE-TS-001` stays **CONTAINED, not closed**; the durable fix (Option C, artifact ownership) is
still deferred to Phase 1 / BND-01.

## 5. Open findings carried forward

| Finding | Status | Classification | Phase 1 impact |
|---|---|---|---|
| `RISK-007` | **OPEN / PLANNED** | Security (SEC-U1 / U2 / U3) | **TO BE DECIDED AT REVIEW** — depends on which boundaries enter Phase 1 |
| `RISK-008` | **OPEN** | **Governance / Tooling Boundary Risk** | **TO BE DECIDED AT REVIEW** |
| Lint (37) | **OPEN** | Classified, owners assigned (classes A–E) | none by itself |
| `PRE-TS-001` | **CONTAINED** | Platform artifact ownership, recurrence #7 | none; Option C deferred to BND-01 |
| `PRE-PDF-001` | **CLOSED** | Test/render defect, root cause documented | none |

### RISK-008 is not closed by the PDF repair

The PDF output is correct again, but the control-plane defect is untouched:

```text
Transformation Tool  →  Boundary Detection  →  Allowed Scope  →  Mutation  →  Verification
                             ^ absent            ^ absent                      ^ after-the-fact
```

`scripts/fixes/**` can still mutate a boundary it does not own, and nothing prevents a re-run from
re-breaking the PDF render boundary. It is registered here as a first-class **Phase 1 risk-register
entry**, not a backlog item.

## 6. Explicit non-claims

```text
G0 Evidence Refresh PASS
   ≠ Architecture PASS
   ≠ Security PASS
   ≠ Production Ready
   ≠ Phase 1 authorization
```

Boundaries certified **0 / 8**. Smart Freeze **ACTIVE** for Tenant Authority, Permission, Ledger
Posting, Payment, Stock Movement, Sync Semantics. `BASELINE-UX4-001` remains **DRAFT**. No agent
self-certification.

## 7. Next step

```text
G0 EVIDENCE REFRESH (this record)
        ↓
HUMAN REVIEW
        ↓  approve
PHASE 1A — Tenant Isolation      → evidence → review
        ↓
PHASE 1B — Authorization / PDP   → evidence → review
        ↓
Per-boundary certification → Domain unfreeze
```

Phase 1 does not start automatically on the strength of this record.
