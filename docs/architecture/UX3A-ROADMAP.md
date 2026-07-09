# UX-3A Roadmap

**Status:** in progress (Wave 2 active).
**Governed by:** ADR-0027 (Roadmap Freeze), ADR-0028 (DS v2 & ui-kit sunset),
ADR-0029 (UI API Uniformity), ADR-0030 (Theme Registry).

## Waves

```text
[1  Platform Foundation]         ✅ BASELINE-UX3A-001 (28/28 fitness)
[2  Design System Consolidation] ⏳ this wave
[2.5 UI API Standardization]     ⏸ Primitives + Composites + Layout + Contracts
[3  Interaction Framework]       ⏸ + begin ui-kit replacement
[4  UX State System]             ⏸ + delete ui-kit
[5  Data Presentation]           ⏸ Table/Cards/Kanban/Timeline/Calendar/Tree/Pivot/Charts
[6  Dashboard Framework]         ⏸ Widget Registry + DnD
[6.5 UI Contracts]               ⏸ View Models
[6.75 Developer Experience]      ⏸ Catalog + Playground + Token Viewer + Icon Gallery
[7  Demo & Showcase]             ⏸
[8  Performance & Quality]       ⏸ Perf + A11y + High-Contrast QA (WCAG AAA)
[9A Read Model Wiring]           ⏸ connect View Models to UX-2C read models
[9B Real-time & Offline]         ⏸ Subscriptions + Optimistic + Offline
[10 MCP Foundation → Tools]      ⏸ resume MCP program
```

## Invariants across all waves

- Kernel (`src/kernel/**`) and Platform (`src/platform/**`) are frozen after Wave 1.
- No new runtime dependencies without an ADR.
- No DB migrations in Waves 2 – 8.
- No changes to existing MCP tools or Edge Functions in Waves 2 – 9B.
- Every wave produces: ADR, Audit, Baseline tag, Fitness gate, Scorecard.
- Every wave ships in `warn → enforcing` order for new fitness checks.

## Scorecard template (per wave)

| Metric | Target |
|---|---|
| Fitness checks | 100% enforcing pass |
| TypeScript strict errors | 0 |
| Type coverage (exported symbols) | ≥ 95% |
| Vitest passing | ≥ baseline (never regress) |
| Test coverage (touched files) | ≥ 90% |
| Build time delta | ≤ +10% vs baseline |
| Bundle budget delta | ≤ ±5% vs baseline |
| Accessibility | WCAG AA (AAA in Wave 8) |
| Breaking changes | 0 |
| Circular deps delta | ≤ 0 |
| Import layer violations delta | ≤ 0 |

Populated by `scripts/audits/build-wave-scorecard.mjs` and pinned in the
wave's `AUDIT-WAVE{N}.md`.
