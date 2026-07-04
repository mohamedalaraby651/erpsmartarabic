# AUDIT-WAVE1 — Mandatory Pre-Wave-2 Stop

- **Wave:** UX-3A Wave 1
- **Baseline:** BASELINE-UX3A-001
- **Fingerprint:** see `scripts/audits/output/architecture-fingerprint.json`

## Purpose

Verify that Kernel and Platform layers remain pure and that migrating `AppLayout` to `PlatformShell` introduced no unintended dependency or layer break. This audit MUST be signed off before Wave 2 (Design System consolidation) begins.

## Checklist

- [ ] `node scripts/fitness/run-all.mjs` → exit 0 (all Wave 1 checks green).
- [ ] `node scripts/audits/architecture-drift-report.mjs` → diff reviewed; every delta vs BASELINE-UX3A-000 traced to a Wave 1 deliverable.
- [ ] `scripts/audits/output/architecture-fingerprint.json.fingerprint` equals `scripts/audits/output/baseline-ux3a-001.json.fingerprint`.
- [ ] `src/kernel/**`: 0 browser globals; 0 imports of React, Supabase, `@/platform/**`, `@/ui/**`, `@/components/**`, `@/features/**`, `@/pages/**`, `@/domain/**`, `@/application/**`, `@/infrastructure/**`.
- [ ] `src/platform/ports/*Port.ts`: 0 imports from `./adapters/**`.
- [ ] `DECLARED_PORTS` = 7; every port has browser + memory adapters and appears in both `PortRegistry.default()` and `PortRegistry.inMemory()`.
- [ ] `new PlatformRuntime(` and `RuntimeContext.Provider` appear ONLY in `src/platform/shell/**` (Provider definition excepted in `src/platform/runtime/`).
- [ ] `AppLayout.tsx` imports `@/platform/shell` and NOT `AdaptiveShell`.
- [ ] `git diff src/ui/**` = empty (no Design System churn).
- [ ] ADRs 0015 / 0023 / 0024 = Accepted.
- [ ] `ux3a-wave1-lock.json` present and integrity-verified.
- [ ] Behavioral parity smoke: shell renders, keyboard shortcut modal opens, mobile drawer opens, RTL preserved, `axe` reports no new violations vs UX-2B baseline.

## Residual risks

- `AdaptiveShell.tsx` remains in-tree (deprecation banner only). Its removal is scheduled for a later wave.
- Wave 1 `NavigationPort` browser adapter uses raw `history` + `popstate`; the router-aware adapter lands in Wave 2 alongside the Design System consolidation.
- Wave 1 `DialogPort` browser adapter falls back to `window.confirm`; a shadcn-based dialog wrapper lands in Wave 2.

Sign-off gates Wave 2.
