# BASELINE-UX3A-002.5

- **Status:** pending — sealed only when `check-ui-api-uniformity` is enforcing and green.
- **Wave:** UX-3A Wave 2.5 (UI API Standardization)
- **Previous:** [BASELINE-UX3A-002](./BASELINE-UX3A-002.md)
- **Governing ADRs:** 0029
- **Lock:** `scripts/audits/output/ux3a-wave2_5-lock.json`
- **Machine-readable:** `scripts/audits/output/baseline-ux3a-002_5.json`
- **Scorecard:** `scripts/audits/output/scorecard-ux3a-wave2_5.json`

## Scope (sealed at wave close)

- Primitives, Composites, Layout unified on a single API surface
  (props, JSDoc tags, ref forwarding, displayName, no `any`).
- Contract tests present for each layer.
- `check-ui-api-uniformity` enforcing; total fitness count 33 → 34.
- ADR-0029 → Accepted.

## Verification

```bash
CHECK_UI_API_UNIFORMITY_ENFORCE=1 node scripts/fitness/run-all.mjs
```
