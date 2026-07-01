# BASELINE-UX2B-001

**Status:** Sealed (immutable per ADR-0013 R-BASE-1)
**Date:** 2026-07-01
**Phase:** UX-2B closed. Starting point for UX-2C.

## Purpose

Fixed architectural snapshot at the moment UX-2B (Application + Infrastructure
+ Composition for the Invoice aggregate) is closed and before UX-2C
(Projection + Read Model + Outbox) begins.

Any deviation from the contracts, ports, migrations, or governance rules
listed in this baseline will be detected by
`scripts/fitness/check-baseline-tag-integrity.mjs` via SHA-256 mismatch.

## Scope

Included at seal time:

- **Accepted ADRs:** 0000, 0002–0006, 0008, 0010, 0011, 0012, 0013.
- **Wave locks:** `ux2a-wave8-lock.json`, `ux2b-wave1-lock.json`,
  `ux2b-wave1_5-lock.json`, `ux2b-wave2b-lock.json`.
- **Surface manifests:** Finance domain, Application layer.
- **PROJECT_MAP.md** at repository root.

The machine-readable digest — including the full file list, each SHA-256, and
the composite SHA-256 — lives at
`scripts/audits/output/baseline-ux2b-001.json`.

## Downstream contract for UX-2C

Waves 3A (Projection + Read Model) and 3B (Outbox) MUST NOT modify anything
enumerated in this baseline. New work adds new files or new sections in
ADR-0014; existing files stay byte-identical.

## Re-issuing

Baselines are never edited. If a governance erratum requires a re-issue, emit
`BASELINE-UX2B-002` and reference the reason in the corresponding ADR.
