# UI Layer Map

Companion to [UX3A Frontend Platform Reference](./reference/UX3A-FRONTEND-PLATFORM.md).

## Layer stack (top consumes bottom only)

```text
┌──────────────────────────────────────┐
│  Pages (src/pages/**)                │  routes only; no business logic
├──────────────────────────────────────┤
│  Feature Modules (src/features/**)   │  consume public façades below
├──────────────────────────────────────┤
│  UX Framework (src/ux/**)            │  interactions · state · presentation · dashboard
├──────────────────────────────────────┤
│  UI Contracts (src/ui-contracts/**)  │  view · interaction · widget · module (types-only)
├──────────────────────────────────────┤
│  Design System (src/design-system/**)│  tokens · primitives · composites · patterns
├──────────────────────────────────────┤
│  Platform (src/platform/**)          │  runtime · ports · registries · shell · modules
├──────────────────────────────────────┤
│  Kernel (src/kernel/**)              │  pure: identity · clock · culture · i18n · env · flags · tenant · permissions
└──────────────────────────────────────┘
```

## Allowed public façades

| From → To | Import path |
|---|---|
| Anywhere → Kernel | `@/kernel` |
| Anywhere → Platform | `@/platform` (or namespaced: `@/platform/ports`, `@/platform/dashboard`) |
| Features/Pages → UI | `@/design-system`, `@/ux`, `@/ui-contracts` |

## Forbidden edges (fitness-enforced)

- `kernel/**` → any React / DOM / network / Supabase.
- `kernel/**` → browser globals (`window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `WebSocket`, `caches`, `indexedDB`, `location`, `history`). See `check-kernel-browser-globals.mjs`.
- `platform/ports/*Port.ts` → `platform/ports/adapters/**` (ports never depend on adapters). See `check-port-adapter-parity.mjs`.
- Anything outside `platform/shell/**` → `new PlatformRuntime(` or `RuntimeContext.Provider`. See `check-platform-shell-single-entry.mjs`.
- Anything outside `platform/shell/**` and `components/layout/AdaptiveShell.tsx` → `AdaptiveShell` imports. See `check-no-new-adaptiveshell-imports.mjs`.
- `design-system/**` → `ux/**`, `platform/**`, `features/**`, `pages/**`.
- `ux/**` → `domain/**`, `application/**`, `infrastructure/**`, `integrations/supabase/**`.
- `features/**` → deep paths inside `platform/**` (must use `@/platform/*` façades).
- Any layer → newly-added runtime dependency without an accepted ADR.

## Wave 1 realised layout (BASELINE-UX3A-001)

- `src/kernel/` — `identity/`, `clock/`, `culture/`, `i18n/`, `env/`, `flags/`, `tenant/`, `permissions/` + `index.ts` façade.
- `src/platform/` — `runtime/`, `ports/` (+ `adapters/browser/`, `adapters/memory/`), `shell/`, `registries/` (reserved), `modules/` (reserved), `ai/` (slot constants only) + `index.ts` façade.


## Status

- **Populated by:** Wave 0 (skeleton) → Wave 1 (kernel + platform) → Wave 2+ (rest).
- **Baseline seal:** `BASELINE-UX3A-000` for this skeleton.
