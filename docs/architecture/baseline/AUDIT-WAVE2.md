# AUDIT — UX-3A Wave 2 (Design System Consolidation)

- **Wave:** UX-3A Wave 2
- **Governing ADRs:** 0027, 0028, 0030
- **Predecessor baseline:** `BASELINE-UX3A-001`
- **Successor baseline:** `BASELINE-UX3A-002` *(to be sealed at wave close)*

## Scope

- `src/ui/tokens/**` — audited, not restructured.
- `src/index.css` — added `[data-theme="high-contrast"]` stub. QA deferred to Wave 8.
- `src/ui/providers/themeRegistry.ts` — new registry contract (ADR-0030).
- `src/ui/providers/ThemeProvider.tsx` — reads from registry, behavior preserved.
- `src/components/ui-kit/index.ts` — frozen (`@deprecated` + dev-only warn).
- 6 discovery scripts under `scripts/audits/`.
- 5 fitness checks under `scripts/fitness/` (warn mode).
- `docs/architecture/design-decisions/` — DS log seeded with DS-001/002/003.

## Out of scope

- `src/kernel/**` and `src/platform/**` — frozen.
- `domain/`, `application/`, `infrastructure/`, feature hooks — unchanged.
- DB migrations, Edge Functions — none.
- Existing MCP tools — untouched (see `docs/mcp/STATUS.md`).

## Scorecard (target values)

| Metric | Target | At wave close |
|---|---|---|
| Fitness checks | 100% enforcing pass | pending |
| TypeScript strict errors | 0 | pending |
| Type coverage (exported symbols) | ≥ 95% | pending |
| Vitest passing | ≥ baseline | pending |
| Test coverage (touched files) | ≥ 90% | pending |
| Build time delta | ≤ +10% | pending |
| Bundle budget delta | ≤ ±5% | pending |
| Accessibility | WCAG AA | pending |
| Breaking changes | 0 | 0 |
| Circular deps delta | ≤ 0 | pending |
| Import layer violations delta | ≤ 0 | pending |

Populated by `scripts/audits/build-wave-scorecard.mjs ux3a-wave2`.

## Discovery reports

- `scripts/audits/output/wave2-discovery/design-system-inventory.{json,md}`
- `scripts/audits/output/wave2-discovery/ui-kit-usage.json`
- `scripts/audits/output/wave2-discovery/ui-kit-allowlist.json`
- `scripts/audits/output/wave2-discovery/component-duplication.json` (with similarity score)
- `scripts/audits/output/wave2-discovery/ui-complexity.json`
- `scripts/audits/output/wave2-discovery/rendering-cost.json`
- `scripts/audits/output/wave2-discovery/ui-dep-graph.json`

## Verification

```bash
node scripts/audits/design-system-inventory.mjs
node scripts/audits/ui-kit-usage.mjs
node scripts/audits/component-duplication.mjs
node scripts/audits/ui-complexity.mjs
node scripts/audits/rendering-cost.mjs
node scripts/audits/ui-dep-graph.mjs
node scripts/fitness/run-all.mjs
node scripts/audits/build-wave-scorecard.mjs ux3a-wave2
```

All commands must exit 0.
