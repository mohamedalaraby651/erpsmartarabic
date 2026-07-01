# ADR-0013 — Baseline Architecture Tags

- **Status:** Accepted
- **Date:** 2026-07-01
- **Area:** Governance / Architectural Snapshots
- **UX Phase:** UX-2B → UX-2C boundary
- **Supersedes:** —

## Context

Between waves the architecture accumulates a set of **immutable artifacts**
(accepted ADRs, wave lock files, surface manifests, `PROJECT_MAP.md`). Without
a stable, retrievable identifier for a specific combination of those artifacts
it is impossible to answer questions like:

- "Which contracts were considered final when Wave 3A began?"
- "Did the projection layer regress any invariant that was locked in UX-2B?"
- "What was the exact surface of the Application layer at that point in time?"

SemVer (`v1.0`, `v1.1`, …) is a **product/package** versioning scheme. It
overloads meaning when re-used for architectural snapshots — a bug fix inside
a wave is not a "patch release" of the architecture, and a new bounded context
is not a "major release" of it.

## Decision

We introduce **Baseline Architecture Tags** as first-class governance artifacts,
separate from any SemVer scheme.

### Naming

```
BASELINE-<PHASE>-<SEQ>
```

- `<PHASE>` — the wave/phase closing at this snapshot (e.g. `UX2B`, `UX2C-W3A`,
  `UX2C-W3B`).
- `<SEQ>` — 3-digit sequence starting at `001`. If a baseline for the same
  phase must be re-issued (rare, e.g. after a contract erratum), a **new** file
  is emitted with the next `SEQ`; the previous baseline is never edited.

Examples: `BASELINE-UX2B-001`, `BASELINE-UX2C-W3A-001`, `BASELINE-UX2C-W3B-001`.

### Composition

A baseline is a **manifest file** at
`docs/architecture/baseline/BASELINE-<PHASE>-<SEQ>.md` accompanied by a
machine-readable digest at
`scripts/audits/output/baseline-<phase>-<seq>.json` containing:

- All **accepted** ADR ids and their file SHA-256.
- All wave `*-lock.json` files considered part of the snapshot, with SHA-256.
- All Surface Manifest files (Finance / Application / future layers), with
  SHA-256.
- `PROJECT_MAP.md` SHA-256.
- A **composite SHA-256** computed deterministically over the sorted list
  above (`sha256(join('\n', map(f => `${f.path}\t${f.sha256}`, sorted)))`).

### Rules

- **R-BASE-1** Baselines are **immutable**. Editing an issued baseline is a
  governance violation. Fix-forward by emitting a new baseline.
- **R-BASE-2** Baselines use the `BASELINE-` prefix and are **not** SemVer.
  SemVer stays reserved for package artifacts and ADR revisions.
- **R-BASE-3** A baseline is only valid if every listed ADR is `Accepted` and
  every listed lock/manifest exists on disk with a matching SHA-256.
- **R-BASE-4** The composite SHA-256 is the canonical identifier for
  cross-referencing (CI, PRs, discussions).
- **R-BASE-5** A fitness check
  (`scripts/fitness/check-baseline-tag-integrity.mjs`) re-computes and
  verifies every baseline on every CI run.

## Consequences

- Any architectural drift after a baseline is detected by the fitness check
  (SHA mismatch) rather than by manual review.
- SemVer remains available for ADR erratum numbering (`ADR-0013 v1.1`) and for
  future npm-published packages without semantic conflict.
- New waves start from a **named reference**, not a moving `HEAD`.

## References

- `scripts/audits/build-baseline-tag.mjs` — builder.
- `scripts/fitness/check-baseline-tag-integrity.mjs` — verifier.
- `docs/architecture/baseline/BASELINE-UX2B-001.md` — first baseline.
