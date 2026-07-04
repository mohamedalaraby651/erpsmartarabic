# ADR-0024 — Runtime Lifecycle

- **Status:** Accepted
- **Date:** 2026-07-04
- **Related:** ADR-0014, ADR-0023, UX3A §Runtime
- **Reference:** [DEPENDENCY_RULES.md §Runtime](../architecture/DEPENDENCY_RULES.md)

## Context

The frontend needs a single, deterministic lifecycle owner that mediates between the host and the application. Feature code must never construct its own runtime or bypass the runtime's ports.

## Decision

1. `PlatformRuntime` owns 5 phases: `bootstrap → startup → hydration → shutdown → recovery`.
2. `RuntimeState` is one of `idle | bootstrapping | starting | hydrating | ready | shutting-down | recovering | failed`.
3. Lifecycle invariants (enforced by unit tests in `src/platform/runtime/__tests__/PlatformRuntime.test.ts`):
   - `startup()` requires prior `bootstrap()`.
   - `hydration()` executes at most once per runtime instance (until `recovery()`).
   - `shutdown()` is idempotent.
   - `recovery()` cannot transition directly to `ready`; the caller must re-run `hydration()`.
   - `failed` is terminal.
4. `PlatformRuntime` is pure TypeScript — no React, no browser globals — and takes all dependencies via `RuntimeConfig` (`clock`, `id`, `flags`, `tenant`, `culture`, `ports`).
5. `PlatformShell` is the sole module allowed to `new PlatformRuntime(...)` and provide `RuntimeContext`. Enforced by `check-platform-shell-single-entry.mjs`.

## Consequences

- Feature code observes lifecycle via `useRuntimePhase()` — never by constructing its own runtime.
- Tests can drive a fully deterministic runtime with `FakeClock`, `CounterIdPort`, `StaticFlagAdapter`, and `PortRegistry.inMemory()`.

## Enforcement

- `check-platform-shell-single-entry.mjs`
- `PlatformRuntime.test.ts` (lifecycle invariants)
