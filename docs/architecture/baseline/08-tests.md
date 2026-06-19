# Baseline 08 — Tests

> Source of truth: [`scripts/audits/output/tests-report.json`](../../../scripts/audits/output/tests-report.json) · Baseline: **UX-0**

## Numbers

| Metric | Value |
| ------ | ----: |
| Vitest test files | 107 |
| Vitest tests passing | **1187 / 1187** |
| Hard Stop triggered? | **No** |

## Rules going forward

- **Never regress.** Any phase that lowers the `passed` count is a Hard Stop until restored.
- New phases (UX-1+) add tests for the new layer they introduce (e.g. UX-1 adds primitive unit tests).
- E2E (Playwright) status is **not** captured by this script — to be added in UX-1.
