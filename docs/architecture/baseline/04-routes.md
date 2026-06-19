# Baseline 04 — Routes

> Source of truth: [`scripts/audits/output/route-report.json`](../../../scripts/audits/output/route-report.json) · Baseline: **UX-0**

## Numbers

| Metric | Value |
| ------ | ----: |
| Total `<Route>` definitions | **98** |
| Workflow candidates (state-machine likely) | (JSON `workflowCandidates`) |

## Breakdown by workspace (heuristic)

See `byWorkspace` in JSON. Finance, sales, inventory, procurement, hr, reports, admin, platform, system, dev, auth, dashboard.

## Per-route fields captured

`route, element, workspace, requiresAuth, permission, dataSources[], mainRepository, workflowCandidate`.

`dataSources` and `mainRepository` are **empty** in UX-0 (they require deeper static analysis or annotations). They are scaffolded so UX-1 can fill them.

## UX-1 → UX-3 inputs

- The **Finance workspace** route list is the starting set for the first Workspace shell (Q4 decision).
- Workflow candidates feed the UX-4 inventory of state machines.
- Admin/Platform routes have their own shell and isolation guarantees.
