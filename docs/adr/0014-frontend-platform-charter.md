# ADR-0014 — Frontend Platform Charter

- **Status:** Draft
- **Date:** 2026-07-01
- **Supersedes:** —
- **Related:** ADR-0002 (UI Shell layout only), ADR-0003 (Canonical primitives), ADR-0004 (Composition contracts), ADR-0013 (Baseline tags)
- **Reference document:** [`docs/architecture/reference/UX3A-FRONTEND-PLATFORM.md`](../architecture/reference/UX3A-FRONTEND-PLATFORM.md)

## Context

The finance domain (UX-2A/2B) is locked and read-model work (UX-2C Wave 3A) is deferred behind a stable read-model contract. To keep frontend progress independent of backend maturation, we adopt a Frontend Platform Reference Architecture (UX3A) that separates the platform runtime, kernel, design system, UX framework, and UI contracts from feature/page code.

This ADR ratifies UX3A as the governing charter for all frontend work through the Wave 6.99 exit gate.

## Decision

1. Adopt UX3A as the *reference architecture* for the frontend. The reference document is immutable; deviations require an ADR amendment and a bumped `Version:` header.
2. Enforce the 7-layer model (Kernel → Platform → Design System → UI Contracts → UX Framework → Feature Modules → Pages) via fitness checks. First check `check-platform-layering.mjs` ships this wave in **report-only** mode; Wave 1 flips it to enforcing.
3. Fold the 8 refinements agreed with the architect into the reference doc: Runtime Lifecycle (§4), Frontend Ports (§5), Module Manifest (§6), Intelligence layer with `context/`/`memory/`/`providers/` (§7), UX State Metadata (§8), Dashboard split (§10), UI Contracts taxonomy (§11), Performance Governance (§12).
4. Execute in staged waves 0 → 6.99. Each wave has its own scoped brief (allowed files, forbidden files, success criteria, fitness activations, stop condition). No wave is broken across turns; no wave bleeds into the next.
5. Seal `BASELINE-UX3A-000` at the end of Wave 0. All later waves must include their lock JSON in a subsequent baseline entry.

## Consequences

- Frontend progress no longer waits on Wave 3A read-model completion.
- Any new runtime dependency requires an ADR amendment (already true, now uniformly enforced).
- Design-system demo routes (`/design-system/*`) are dev/staging only and code-split out of production bundles.
- The reference document becomes the single source of truth for boundaries; disagreements are resolved by ADR, not by ad-hoc code review.

## Follow-ups

- Wave 1 promotes ADRs 0015, 0023, 0024 to Accepted.
- Waves 2–6.9 promote ADRs 0016–0022, 0025 to Accepted as scoped.
- Wave 6.99 promotes ADR-0014 (this doc) to **Accepted** and seals `BASELINE-UX3A-001`.
