# Baseline 06 — Performance (Manual)

> Status: **Manual measurement template.** Automated capture is deferred to UX-8 per plan.
> Source of truth (when measured): `scripts/audits/output/performance-report.json` (not yet generated).

## Method

Open each route in Chrome (incognito, throttling = "Slow 4G", CPU = "4×"), open DevTools Performance panel, hard-refresh, capture:

- **LCP** (Largest Contentful Paint)
- **CLS** (Cumulative Layout Shift)
- **INP** (Interaction to Next Paint — click main action)
- **TTI** (Time to Interactive)
- **JS heap (MB)** at idle
- **DOM nodes** at idle
- **Network requests** (count)
- **Largest API call (ms)** and **slowest API call (ms)**

Record results in the table below, then commit alongside the next manifest update.

## Routes to measure (5)

| Route | Why |
| ----- | --- |
| `/` (Dashboard) | landing surface; cold start |
| `/customers` | list view; biggest table |
| `/invoices` | finance core; document list |
| `/invoices/:id` | document detail; heaviest single page |
| `/reports` | aggregation heavy; chart-rendering |

## Template

| Route | LCP | CLS | INP | TTI | Heap | DOM | Reqs | Largest API | Slowest API |
| ----- | --: | --: | --: | --: | ---: | --: | ---: | ----------: | ----------: |
| `/` | | | | | | | | | |
| `/customers` | | | | | | | | | |
| `/invoices` | | | | | | | | | |
| `/invoices/:id` | | | | | | | | | |
| `/reports` | | | | | | | | | |

> UX-0 captures the method, not the numbers. The phase is closed once the table is filled and committed.
