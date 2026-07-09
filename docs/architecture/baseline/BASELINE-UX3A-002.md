# BASELINE-UX3A-002

- **Status:** pending — sealed only when all Wave 2 fitness checks are enforcing and green.
- **Wave:** UX-3A Wave 2 (Design System Consolidation)
- **Previous:** [BASELINE-UX3A-001](./BASELINE-UX3A-001.md)
- **Governing ADRs:** 0027, 0028, 0030
- **Lock:** `scripts/audits/output/ux3a-wave2-lock.json`
- **Machine-readable:** `scripts/audits/output/baseline-ux3a-002.json`
- **Scorecard:** `scripts/audits/output/scorecard-ux3a-wave2.json`

## Scope (sealed at wave close)

- Design tokens (`src/ui/tokens/**`) audited and documented in
  `DESIGN-TOKENS-V2.md`.
- Theme Registry (`src/ui/providers/themeRegistry.ts`) live behind
  `ThemeProvider`, per ADR-0030.
- High-contrast palette stub in `src/index.css` — QA deferred to Wave 8.
- `src/components/ui-kit/**` frozen with `@deprecated` + dev warning.
- 5 fitness checks flipped from warn → enforcing.
- 6 discovery reports pinned under `scripts/audits/output/wave2-discovery/`.
- ADR-0027, ADR-0028, ADR-0030 → Accepted.

## Verification

Run:
```bash
CHECK_NO_RAW_COLORS_ENFORCE=1 \
CHECK_TYPOGRAPHY_TOKENS_ENFORCE=1 \
CHECK_SPACING_ELEVATION_ENFORCE=1 \
CHECK_DS_INVENTORY_ENFORCE=1 CHECK_DS_INVENTORY_BUDGET=0 \
CHECK_NO_NEW_UIKIT_ENFORCE=1 \
  node scripts/fitness/run-all.mjs
node scripts/audits/build-wave-scorecard.mjs ux3a-wave2
```

All must exit 0.
