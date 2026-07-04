# Dependency Rules — Canonical Layer Specification

- **Status:** Locked
- **Version:** 1.0.0
- **Owner:** Architecture Council
- **Companion reference:** [`reference/UX3A-FRONTEND-PLATFORM.md`](./reference/UX3A-FRONTEND-PLATFORM.md)
- **Charter:** [ADR-0014](../adr/0014-frontend-platform-charter.md)

This document is the single source of truth for dependency direction across frontend layers. Every fitness check and ADR cites it by section id (e.g. `DR-§3.2/kernel-purity`).

## §1 Layer order (upstream → downstream)

```text
Kernel → Platform → Design System → UI Contracts → UX Framework → Feature Modules → Pages
```

Lower layers MUST NOT import upper layers. Upper layers import lower layers only through public façades.

## §2 Public façades (whitelist)

- `@/kernel`
- `@/platform`
- `@/platform/ports`
- `@/platform/runtime`
- `@/platform/shell`

Deep imports across layer boundaries (e.g. `@/platform/runtime/PlatformRuntime`) from outside the owning layer are forbidden.

## §3 Wave 1 Architectural Invariants

| # | Invariant | Enforcement |
|---|---|---|
| 1 | Platform never depends on UX. | `check-platform-layering` |
| 2 | Kernel never depends on Platform. | `check-platform-layering` |
| 3 | Ports never depend on their adapters. | `check-port-adapter-parity` |
| 4 | `AppLayout` imports `PlatformShell` only. | `check-no-new-adaptiveshell-imports` |
| 5 | `PlatformShell` is the single runtime entry point. | `check-platform-shell-single-entry` |
| 6 | Only public façades are importable across layers. | `check-platform-layering`, `check-no-deep-imports` |
| 7 | Deep imports across layer boundaries are forbidden. | `check-no-deep-imports` |
| 8 | `PlatformRuntime` owns lifecycle. | `PlatformRuntime.test.ts` |
| 9 | Runtime owns Ports; `PortRegistry` contains all declared ports. | `check-port-registry-completeness` |
| 10 | UI owns rendering only — no business logic in Platform or Kernel. | `check-platform-layering` |
| 11 | No business logic from Domain / Application / Infrastructure / Supabase enters Platform or Kernel. | `check-platform-layering` |
| 12 | Kernel is browser-globals-free. | `check-kernel-browser-globals` |

## §3.2 Kernel purity (`DR-§3.2/kernel-purity`)

`src/kernel/**` MUST NOT import from:
- `react`, `react-dom`
- `@/integrations/supabase/**`
- `@/platform/**`, `@/ui/**`, `@/components/**`, `@/features/**`, `@/pages/**`
- `@/domain/**`, `@/application/**`, `@/infrastructure/**`

`src/kernel/**` MUST NOT reference browser globals: `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `WebSocket`, `caches`, `indexedDB`, `location`, `history` (including via `globalThis`).

## §3.3 Ports (`DR-§3.3/ports`)

- Interfaces live at `src/platform/ports/*Port.ts`.
- Adapters live at `src/platform/ports/adapters/{browser,memory}/`.
- Port files MUST NOT import from `./adapters/**`.
- `DECLARED_PORTS` enumerates every port; both `PortRegistry.default()` and `PortRegistry.inMemory()` must register each.

## §3.4 Runtime (`DR-§3.4/runtime`)

- `PlatformRuntime` phases: `bootstrap → startup → hydration → shutdown → recovery`.
- `startup()` requires prior `bootstrap()`.
- `hydration()` runs at most once until `recovery()` resets it.
- `shutdown()` is idempotent.
- `recovery()` cannot transition directly to `ready`.
- `failed` is terminal.

## §3.5 Shell (`DR-§3.5/shell`)

- `new PlatformRuntime(` may appear only inside `src/platform/shell/**`.
- `RuntimeContext.Provider` may appear only inside `src/platform/shell/**` (definition lives in `src/platform/runtime/`).
- `AppLayout.tsx` imports `@/platform/shell` and nothing else that composes the shell.

## §4 Change protocol

Amendments require an ADR that bumps the `Version:` header. Fitness checks reference invariants by section id; changing an id requires updating every referencing check in the same amendment.
