# ADR-0027 — UX-3A Roadmap Freeze

- **Status:** Accepted
- **Date:** 2026-07-08
- **Depends on:** ADR-0014, ADR-0015, ADR-0023, ADR-0024

## Context

After sealing `BASELINE-UX3A-001` (Wave 1: Platform Foundation), we need a
long-horizon roadmap for the frontend platform before adding domain features,
Read Model wiring, or expanded MCP tooling. Without a fixed roadmap, wave
scoping drifts and design/architecture debt accumulates.

## Decision

The frontend program is frozen to the following 13-wave sequence. No parallel
paths, no shortcuts. Each wave produces its own ADR, Baseline tag, Fitness
Scorecard, and Wave lock file.

| # | Wave | Deliverable |
|---|------|-------------|
| 1 | Platform Foundation | ✅ sealed (`BASELINE-UX3A-001`) |
| 2 | Design System Consolidation | tokens, ui-kit freeze, discovery |
| 2.5 | UI API Standardization | Primitives + Composites + Layout + Contracts uniform API |
| 3 | Interaction Framework | Create / Edit / Delete / Wizard / Bulk / Search / Import / Export |
| 4 | UX State System | 11 canonical states + `useUXState`, ui-kit deleted |
| 5 | Data Presentation | Table / Cards / Kanban / Timeline / Calendar / Tree / Pivot / Charts |
| 6 | Dashboard Framework | Widget Registry + DnD |
| 6.5 | UI Contracts (View Models) | typed contracts between UI and read layer |
| 6.75 | Developer Experience | Component Catalog, Playground, Token Viewer, Icon Gallery |
| 7 | Demo & Showcase | internal QA surfaces |
| 8 | Performance & Quality | Perf + A11y + Bundle + Lazy + Virtualization + Memory + Lighthouse + Keyboard + High-Contrast QA |
| 9A | Read Model Wiring | connect View Models to UX-2C read models |
| 9B | Real-time & Offline | Subscriptions + Optimistic + Offline |
| 10 | MCP Foundation → Tools | resume MCP program |

## Consequences

- Kernel (`src/kernel/**`) and Platform (`src/platform/**`) are **frozen**
  after Wave 1. No further changes until Wave 9A at the earliest.
- MCP program is paused. The three existing tools remain; no new tools,
  no Foundation work, until Wave 10 (see `docs/mcp/STATUS.md`).
- Every wave requires: ADR + Audit + Baseline tag + Fitness gate +
  Scorecard. A wave is not "done" until all five artefacts exist.

## Non-goals

- Not a schedule. Waves may take variable time. Only sequence is fixed.
- Not a feature roadmap. Business features are delivered through waves,
  not around them.
