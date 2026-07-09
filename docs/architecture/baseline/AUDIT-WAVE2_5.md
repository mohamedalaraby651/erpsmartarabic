# AUDIT — UX-3A Wave 2.5 (UI API Standardization)

- **Wave:** UX-3A Wave 2.5
- **Governing ADRs:** 0029
- **Predecessor baseline:** `BASELINE-UX3A-002`
- **Successor baseline:** `BASELINE-UX3A-002.5` *(to be sealed at wave close)*

## Scope

- API uniformity across `src/ui/primitives/**`, `src/ui/composites/**`,
  `src/ui/layout/**`, `src/ui/contracts/**`.
- Contract tests for each layer under `__tests__/api-uniformity.test.ts`.
- `check-ui-api-uniformity` flips warn → enforcing at wave close.
- No breaking changes; additive props only.

## Out of scope

- Kernel and Platform (frozen).
- Wave 2 token work (already sealed).
- Feature-code migrations off `ui-kit` (Wave 3).

## Scorecard target

Same 11-metric template as Wave 2. Additional row:

| Metric | Target |
|---|---|
| Components with `@canonicalState Canonical` | 100% of Primitives + Composites + Layout |

## Verification

```bash
CHECK_UI_API_UNIFORMITY_ENFORCE=1 node scripts/fitness/run-all.mjs
node scripts/audits/build-wave-scorecard.mjs ux3a-wave2_5
```
