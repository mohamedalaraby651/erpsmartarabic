# Decision Log

Lightweight log for decisions that do **not** warrant a full ADR (tool choices, naming, library swaps within an already-approved boundary).

| Date | Phase | Decision | Rationale | Owner |
| ---- | ----- | -------- | --------- | ----- |
| 2026-06-19 | UX-0 | Use `madge` for circular dep detection | Mature, deterministic JSON output | Architecture |
| 2026-06-19 | UX-0 | Use `rollup-plugin-visualizer` for bundle JSON | Native Rollup, no Webpack adapter required | Architecture |
| 2026-06-19 | UX-0 | Use `depcheck` for unused deps | Standard, deterministic | Architecture |
| 2026-06-19 | UX-0 | Use `ts-complex` for cyclomatic complexity | Pure TS, no Java/CLI deps | Architecture |
