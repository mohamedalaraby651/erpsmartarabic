# BASELINE-UX3A-001

- **Sealed:** 2026-07-04
- **Re-sealed:** 2026-07-11 (Sprint 1.5 — intentional drift from Wave 2 Sprint 1 Batch A: 22 files remediated for tokens/typography/spacing; ADR-0013 re-hash executed via `build-baseline-tag.mjs UX3A 001`)
- **Wave:** UX-3A Wave 1
- **Previous:** [BASELINE-UX3A-000](../../../scripts/audits/output/baseline-ux3a-000.json)
- **Fingerprint:** see `scripts/audits/output/architecture-fingerprint.json`
- **Lock:** `scripts/audits/output/ux3a-wave1-lock.json`
- **Machine-readable:** `scripts/audits/output/baseline-ux3a-001.json`

- **Machine-readable:** `scripts/audits/output/baseline-ux3a-001.json`

## Scope

Kernel (`src/kernel/**`), Platform (`src/platform/**`), and the migrated `src/components/layout/AppLayout.tsx`. `src/ui/**` unchanged.

## Sealed artefacts

- 8 kernel sub-modules with `@/kernel` façade.
- `PlatformRuntime` with 5-phase lifecycle.
- 7 Frontend Ports × 2 adapters (browser + memory), single `PortRegistry` injection surface.
- `PlatformShell` — sole runtime entry point.
- 6 fitness checks (5 new + `check-platform-layering` flipped to enforcing).
- 3 ADRs promoted to Accepted: 0015, 0023, 0024.
- Architecture Drift Report generator + Wave 1 diff.
- Architecture Fingerprint embedded in this baseline.

## Verification

Run `node scripts/fitness/run-all.mjs` and `node scripts/audits/architecture-drift-report.mjs`. Both must exit 0. The fingerprint must equal the value pinned in `architecture-fingerprint.json`.
