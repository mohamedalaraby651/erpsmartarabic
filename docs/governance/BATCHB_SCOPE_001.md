# BATCHB-SCOPE-001 — Frozen Scope Contract

**Status: LOCKED.** Frozen at Phase C1. Any change to this document is a Scope Amendment requiring human approval before any edit is made.

## Purpose

Close Sprint 3.1 Batch B residual presentation-layer `pages → repositories` violations.

## Baseline

```text
BASELINE-NAZRA-001
Commit: a33f49b9
```

## Observed starting point (canonical, Phase A)

| Signal | Value |
|---|---|
| `pages → repositories` | 27 |
| Critical layer violations (total) | 171 |
| UI cycles | 0 |
| Max FanOut | 59 |
| Fitness failures | 0 |

## Target

| Signal | Target |
|---|---|
| `pages → repositories` | ≤ 13 |
| Critical layer violations | ≤ 155 |
| UI cycles | 0 |
| FanOut | no regression |

## Projections — NOT evidence

`27 → 11` and `171 → 155` are Phase A **projections**. They become evidence only after a fresh post-C2 measurement run.

## Execution set — 16 authorized items

```text
1  redirect to an existing facade
15 grouped-facade redirects
───────────────────────────────
16 authorized changes
```

## Deferred set — 11 rows, non-reclassifiable

Phase A matrix rows 1, 9, 11, 12, 13, 15, 16, 17, 20, 24, 25. These remain untouched. C2 may **not** reclassify them. If one becomes necessary to complete an authorized row: STOP → explain dependency → human decision → scope amendment.

## Allowed

- Reuse the `customers`, `suppliers`, `products`, `customer-search` facades
- Create exactly the eight domain-coherent facades below, each with proven ≥2 consumers
- Presentation-layer import redirection
- Minimal query composition explicitly required by a Phase A decision

### Approved new facades (8)

```text
admin · treasury · expenses · reference
attendance · quotations · sales-orders · purchase-orders
```

`documents` and `finance` are **removed from Batch B entirely** — Phase A rejected them as catch-all buckets.

> **Facade rule.** A facade groups a coherent query responsibility; it must never become a catch-all escape hatch. It stays thin: `Consumer → Facade → existing query/repository`.

Each facade must record all six admission proofs: ≥2 consumers · coherent responsibility · wraps an existing repository/query responsibility · no business logic · not a hook-as-facade · no semantic change.

## Forbidden

Business logic changes · domain changes · repository semantic changes · database changes · SQL changes · RLS changes · migration changes · Edge Function changes · authentication redesign · PDP implementation · idempotency implementation · audit implementation · offline sync changes · hook-as-facade · dependency upgrades · unrelated cleanup · refactoring outside the decision matrix · security remediation unrelated to Batch B.

## Evidence required (fresh, post-C2)

```text
tsgo
build
lint
vitest
node scripts/fitness/run-all.mjs
dependency graph (before + after)
cycle analysis
layer violation counts
FanOut (before + after)
changed-file scope audit (exact set equality vs scope hash)
git diff review
```

## Scope Hash

```text
Algorithm: approved paths → POSIX separators → lexicographic sort (LC_ALL=C)
           → newline-delimited canonical text → SHA-256

Scope Hash: eab102bd71ccd916f5cf32284d27d0b03ed32008b0849b18687740f7fa32eb84
```

The approved file list is enumerated in `docs/architecture/WAVE1_SPRINT3_BATCHB_PHASEC1.md` (Scope Integrity Block). Verification is **exact set equality** (`Actual == Approved`), not subset.

## Certification

Lovable may **NOT** self-certify Batch B. Certification is a human act after evidence review.

## Stop conditions

STOP immediately if: a deferred row becomes necessary · a new facade is proposed without ≥2 consumers · domain/business logic must change · repository semantics must change · DB/RLS/SQL/Edge Function changes become necessary · the target architecture cannot be achieved within this scope · FanOut regresses materially · UI cycles become non-zero · evidence generation fails · unrelated files are modified.

## Out of scope by governance decision

- `PRE-TS-001` (Platform Regeneration Drift) — independent Preflight Unit, zero scope-hash impact
- 2FA containment record and `RISK-007` security backlog — separate Security Track
