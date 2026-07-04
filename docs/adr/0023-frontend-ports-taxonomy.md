# ADR-0023 — Frontend Ports Taxonomy

- **Status:** Accepted
- **Date:** 2026-07-04
- **Related:** ADR-0014 (Frontend Platform Charter), UX3A §Ports
- **Reference:** [DEPENDENCY_RULES.md §Ports](../architecture/DEPENDENCY_RULES.md)

## Context

Wave 1 introduces the seven Frontend Ports through which the platform accesses host capabilities. Each port must have a concrete adapter for the real browser AND a deterministic in-memory adapter for tests and headless runtimes.

## Decision

1. Seven ports live under `src/platform/ports/`:
   - `NotificationPort`, `DialogPort`, `NavigationPort`, `StoragePort`, `ClipboardPort`, `FilePickerPort`, `SharePort`.
2. Port interfaces MUST NOT import from `./adapters/**`. Adapters depend on ports; never the reverse. Enforced by `check-port-adapter-parity.mjs`.
3. Every port has both a browser adapter (`src/platform/ports/adapters/browser/`) and an in-memory adapter (`src/platform/ports/adapters/memory/`).
4. `PortRegistry` is the single injection surface. `DECLARED_PORTS` enumerates every port and is the source of truth for completeness checks. Enforced by `check-port-registry-completeness.mjs`.

## Consequences

- New ports require: interface, both adapters, `DECLARED_PORTS` entry, `PortMap` entry, factory wiring — all covered by fitness.
- Any consumer can obtain any port via `runtime.config.ports.get(name)`.

## Enforcement

- `check-port-adapter-parity.mjs`
- `check-port-registry-completeness.mjs`
- `check-platform-layering.mjs` (façade rules)
