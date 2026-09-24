# OPA-CUST-UI-005 v2.0 — G1 Technical Closure Record
Status: IMPLEMENTED + VERIFIED / NOT HUMAN ACCEPTED / NOT CERTIFIED — 2026-09-24

## Checks
- Tests: 1638 passed / 5 skipped (163 files). Customer-scoped re-run after fix: 12/12.
- Scoped ESLint (customers pages/components/hooks): 0 errors, 53 warnings (pre-existing class).
- Production build: PASS.
- Typecheck: FAIL only on protected generated `src/integrations/supabase/previewAuthStorage.ts` TS7011 (lines 81, 85). Recorded as separate platform blocker (PRE-TS-001 recurrence); not touched.

## Regression found and fixed (in scope)
- At 1280px the stats strip inside the table header scrolled horizontally with wide column sets, clipping «الكل»/«نشط». Moved the strip into a pinned header band inside the same bordered table frame (`CustomerTable.tsx`). No data/query change.

## Baseline (live, RTL, authenticated)
| Width | First rows | REST requests | Rows/cards | DOM nodes | Page overflow | Page errors |
|---:|---:|---:|---:|---:|---:|---:|
| 360 | 4471ms | 34 | 15 cards | 2246 | none | 0 |
| 768 | 1495–2240ms | 25–35 | 15 rows | 1590 | none | 0 |
| 964 | 2261ms | 25 | 15 rows | 1590 | none | 0 |
| 1280 | 1754–1899ms | 25 | 15 rows | 1590 | none | 0 |

## Recorded, deferred to B2
- Desktop table still needs horizontal scroll at 1280 to reach the actions column; B2 collapses row actions into one "More" menu.
- Mobile first-render (4.5s, 34 requests) is the slowest path; input for B3 baseline.
