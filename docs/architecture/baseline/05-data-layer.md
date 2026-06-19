# Baseline 05 — Data Layer

> Source of truth: [`scripts/audits/output/data-access-report.json`](../../../scripts/audits/output/data-access-report.json) · Baseline: **UX-0**

## Numbers

| Metric | Value |
| ------ | ----: |
| Total `supabase.*` hits (all layers) | **625** |
| **UI hits** (`components/` + `pages/`) — official baseline | **150** |
| Repositories present | **44** |
| Query services present | **2** |
| Mean repository reuse (consumers / repo) | **2.91** |
| Mean query reuse (consumers / query) | **4** |

> The plan's "161" was the pre-UX-0 official check-data-access.sh count. UX-0 classification of `from(...).select` is stricter (`{read,write,rpc,storage,realtime,auth}`) producing **150 UI hits**. The legacy script remains the single CI gate; this number is the *classified* breakdown.

## Classification (full table in JSON `byTypeByLayer`)

For each of `read / write / rpc / storage / realtime / auth`, the JSON gives a count per layer (`ui:components`, `ui:pages`, `hooks`, `lib:repositories`, `lib:queries`, `lib:other`, `integrations`, `domain`).

## UX-2 → UX-7 plan

1. UX-2 introduces contracts; each UI hit migrates to a repository call.
2. Every migration is verified against the baseline count — **only `lib:repositories`, `lib:queries`, and `integrations:` layers may grow**; UI layers must monotonically decrease.
3. Shadow Repository regression (RISK-001) is the guarded failure mode.
