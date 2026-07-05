# AUDIT-WAVE1 — Mandatory Pre-Wave-2 Stop

- **Wave:** UX-3A Wave 1
- **Baseline:** BASELINE-UX3A-001
- **Fingerprint:** `6e4bcc7568111316161999d71e5f84aa4690f5606dd4220521fd9698884822d2`
- **Status:** ✅ SIGNED OFF — 2026-07-05
- **Fitness result:** `active=28 pending=0 failures=0`

## Purpose

Verify that Kernel and Platform layers remain pure and that migrating `AppLayout` to `PlatformShell` introduced no unintended dependency or layer break. This audit MUST be signed off before Wave 2 (Design System consolidation) begins.

## Checklist

- [x] `node scripts/fitness/run-all.mjs` → exit 0 (28/28 green, including the 6 Wave 1 checks).
- [x] `node scripts/audits/architecture-drift-report.mjs` → diff reviewed; every delta vs BASELINE-UX3A-000 traced to a Wave 1 deliverable (kernel: 0→9, platform: 0→32, façade usage `@/kernel` / `@/platform` / `@/platform/shell` all > 0).
- [x] `scripts/audits/output/architecture-fingerprint.json.fingerprint` equals the fingerprint embedded in `baseline-ux3a-001.json` (`6e4bcc75…4822d2`).
- [x] `src/kernel/**`: 0 browser globals; 0 imports of React, Supabase, `@/platform/**`, `@/ui/**`, `@/components/**`, `@/features/**`, `@/pages/**`, `@/domain/**`, `@/application/**`, `@/infrastructure/**` (verified by `check-kernel-browser-globals` + `check-platform-layering`).
- [x] `src/platform/ports/*Port.ts`: 0 imports from `./adapters/**` (verified by `check-port-adapter-parity`).
- [x] `DECLARED_PORTS` = 7; every port has browser + memory adapters and appears in both `PortRegistry.default()` and `PortRegistry.inMemory()` (verified by `check-port-registry-completeness`).
- [x] `new PlatformRuntime(` and `RuntimeContext.Provider` appear ONLY in `src/platform/shell/**` (verified by `check-platform-shell-single-entry`).
- [x] `AppLayout.tsx` imports `@/platform/shell` and NOT `AdaptiveShell` (verified by `check-no-new-adaptiveshell-imports`).
- [x] `src/ui/**` untouched — no Design System churn during Wave 1.
- [x] ADRs 0015 / 0023 / 0024 = Accepted.
- [x] `ux3a-wave1-lock.json` present and integrity-verified (`baseline-tag-integrity` PASS on BASELINE-UX3A-001, 20 entries).
- [x] Behavioral parity smoke: `PlatformShell` renders `AdaptiveShell` unchanged — keyboard shortcut modal, mobile drawer, RTL, and axe results unchanged vs UX-2B baseline.
- [x] No new runtime dependency added during Wave 1.

## Residual risks (accepted, deferred)

- `AdaptiveShell.tsx` remains in-tree behind `PlatformShell` (deprecation banner only). Removal scheduled for a post-Wave-2 cleanup wave. **Accepted.**
- `NavigationPort` browser adapter uses raw `history` + `popstate`; router-aware adapter lands in Wave 2. **Deferred to Wave 2.**
- `DialogPort` browser adapter falls back to `window.confirm`; shadcn-based dialog wrapper lands in Wave 2. **Deferred to Wave 2.**

No unaccepted technical debt introduced by Wave 1.

## Sign-off

Wave 1 is architecturally closed. **BASELINE-UX3A-001** is the official baseline for all subsequent waves. Wave 2 (Design System Consolidation) is unblocked and MUST operate under the invariants recorded in `docs/architecture/DEPENDENCY_RULES.md` and this baseline's fingerprint.
