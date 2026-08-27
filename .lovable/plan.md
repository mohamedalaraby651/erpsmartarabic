# Phase C1 — Scope Freeze + Execution Plan (No Code Changes)

Authority granted by this plan ends at the end of C1. **No source file is modified.** C2 (remediation) starts only after a separate human review of the C1 table.

## Approved architectural correction

`documents` / `finance` are removed from Batch B entirely. The eight domain-coherent Phase A facades (each with proven ≥2 consumers) are the only new facades:

```text
admin · treasury · expenses · reference · attendance · quotations · sales-orders · purchase-orders
```

Rule recorded in the frozen scope: a facade groups a coherent query responsibility; it must never become a catch-all escape hatch. Everything else in `BATCHB-SCOPE-001` is recorded verbatim.

## Deliverable 1 — `docs/governance/BATCHB_SCOPE_001.md` (frozen contract)

Records verbatim: purpose, baseline (`BASELINE-NAZRA-001` @ `a33f49b9`), starting point (27 / 171 / 0 cycles), targets (≤13 / ≤155 / 0 cycles / no FanOut regression), execution set (1 redirect + 15 grouped-facade), the 11-row deferred set, the allowed list, the forbidden list, evidence requirements, the no-self-certification rule, and all ten stop conditions. Plus a scope hash over the approved file list so C2 can prove `changed files == approved files`.

Also recorded, explicitly labelled as **projections, not evidence**: 27 → 11 and 171 → 155.

## Deliverable 2 — `docs/architecture/WAVE1_SPRINT3_BATCHB_PHASEC1.md` (execution plan)

One row per each of the 16 execution-set items, with the columns you specified:

| # | File | Current import | Target facade | New or existing | Consumers | Reason | Expected dependency delta | Risk |
|---|---|---|---|---|---|---|---|---|

Row set (from the Phase A matrix): 1 redirect (`ProductDetailsPage` → existing `queries/products`) and 15 grouped-facade redirects across `admin` (6), `treasury` (2), `expenses` (1), `reference` (1), `attendance` (1), `quotations` (1), `sales-orders` (1), `purchase-orders` (1), `adminMetrics` rows folded into `admin`.

Each row states whether the import is type-only or value, since type-only redirects carry near-zero runtime risk and value redirects need the facade to re-export the same symbol identity.

The document ends with: the facade files to be created (8), the exact symbols each re-exports, the untouched deferred list (11 rows), and the pre/post evidence commands to be run in C2.

Per-facade admission proof C2 must record (all six, not consumer count alone): ≥2 consumers · coherent responsibility · wraps an existing repository/query responsibility · no business logic · not a hook-as-facade · no semantic change. The facade must stay thin: `Consumer → Facade → existing query/repository`, nothing else.

## Deliverable 3 — security separation record

`docs/security/2fa-containment-record.md`:

```text
Exposure:       CONTAINED
Verification:   REQUIRED
Certification:  NOT CERTIFIED
Outstanding proofs: 5
```

The five proofs: unauthorized client read denied · server verification works · backup-code verification works · tenant/RLS boundary correct · secret material not exposed.

`docs/risk-log/RISK-007-security-backlog.md`: the 6 remaining scanner findings (1 TOTP-related, 5 raw DB error disclosure) recorded as a **separate track**, not classified as false positives without scanner evidence, and explicitly out of Batch B.

## Deliverable 4 — governance append

`PROGRESS_LOG.md` gets one appended record: scope frozen, C1 produced, C2 not started, no source files modified, no certification claimed.

## Scope Integrity Block (contractual, ends `WAVE1_SPRINT3_BATCHB_PHASEC1.md`)

```text
Scope Integrity
───────────────
Baseline: BASELINE-NAZRA-001
Commit:   a33f49b9

Authorized remediation items: 16   (1 redirect + 15 grouped-facade)
Deferred items:               11   (untouched, non-reclassifiable)
New facade count:              8

Approved source files:  [exact list]
Approved facade files:  [exact list]

Scope Hash: SHA-256 of
  (approved paths → POSIX separators → lexicographic sort
   → newline-delimited canonical text)

C2 may modify ONLY approved source files and approved facade files.
Any file outside the set                → STOP
Any new architectural decision          → STOP
Any change to a deferred item           → STOP
Any DB/RLS/SQL/Edge Function change     → STOP
```

The hash is contractual, not metadata. C2 verification: `git diff --name-only` → normalize separators → sort → compare against the approved set, requiring **exact set equality** (`Actual == Approved`), not `Actual ⊆ Approved`. Any difference in either direction is a STOP, even for a trivial file. The only exception is a written Scope Amendment approved *before* the edit. If a deferred row turns out to be required by one of the 16: STOP → explain dependency → human decision → scope amendment.

Baseline chain for C2 (no full re-analysis): `BASELINE-NAZRA-001 @ a33f49b9` + Phase A evidence + C1 scope hash + C1 decision matrix → C2 → delta + evidence → `BASELINE-NAZRA-002` on human approval.

## Hard rules for this wave

- Zero writes under `src/**`.
- No SQL, RLS, migration, or edge-function change.
- No decision widened beyond the Phase A matrix.
- Per row, `type-only` stays `import type` (never promoted to a runtime dependency); `value` rows must prove identical exported symbol identity through the facade with unchanged runtime semantics.
- C1 ends literally with:

```text
PHASE C1 — COMPLETE
Implementation:  VERIFIED
Source Changes:  0
Scope:           FROZEN
Evidence:        AVAILABLE
Certification:   NOT CERTIFIED

STOP — HUMAN REVIEW REQUIRED
```

## PRE-TS-001 — recurrence, recorded not fixed here

`previewAuthStorage.ts` (81, 85) lost the Unit 1 annotations through platform regeneration, so TS7011 is back. Plan mode cannot touch source files. `PRE_EXISTING_ISSUES.md` gets this lifecycle record:

```text
PRE-TS-001
Original remediation:  CLOSED
Cause:                 Platform regeneration
Recurrence:            OPEN
Classification:        Platform Regeneration Drift
Batch B impact:        NONE
Scope hash impact:     NONE
```

The next fix is an **independent Preflight Unit**, run before C2 and never bundled with Batch B: investigate why the edit was lost (is the file truly generated · what generator/canonical source produces it · what triggers regeneration) before re-applying annotations, since patching a generated artifact may not be a durable remedy. Sequence: recurrence → independent Unit 1 → fix → typecheck + build → evidence → clean checkpoint → Batch B C2.
