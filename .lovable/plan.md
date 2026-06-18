# Phase 1C — Batch A: Close Repository Layer Leaks (Revised)

Scope: **Batch A only**. Batches B–E remain deferred until Gate A passes.

## Baseline (measured)
- 43 repositories under `src/lib/repositories/`.
- 26 UI files (`src/components/**`, `src/pages/**`) still call `supabase.from(...)` / `.rpc(...)` directly.
- ESLint already warns on `@/integrations/supabase/client` imports from UI.

## Goal
Drive direct Supabase usage in UI from **26 → 0** by routing through existing repositories or thin new ones. **No business logic, schema, or API contract changes.**

## Approach

### 1. Inventory & classify (read-only first)
Produce `docs/architecture/data-orchestration-batchA.md` with one row per leak, classified as:
- **Reuse** — existing repo already covers it; swap the call site only.
- **Extend** — existing repo gains one small method (move the inline query in; no new logic).
- **New thin repo** — no repo exists for this aggregate; create a minimal one. Every "New" row must carry one of these justification codes:
  - `New aggregate` — the entity has no repository yet.
  - `Boundary mismatch` — an existing repo covers a different aggregate; merging would weaken the boundary.
  - `Technical specialization` — distinct technical concern (import/export, reporting, telemetry) that doesn't fit any existing repo.
  - Any other justification is a red flag and triggers a design re-evaluation before continuing.
- **Documented exception** — falls into the closed exception list below.

### 2. Reports are not automatic aggregates
Read-only composed queries (joins / RPCs that feed a report view) should attach to the owning aggregate's repository as `getX(...)` methods rather than spawning a new repo per report. Concretely:
- `SupplierAgingReport`, `SupplierAgingChart`, `SupplierHealthBadge` → methods on `supplierRepository` (or existing `supplierRelationsRepo`), e.g. `getAging`, `getHealthScore`.
- `CustomerAgingReport`, `CustomerHealthBadge`, `AgingDonutChart` → methods on `customerRepository`.
- `StatementOfAccount`, `SupplierStatementTab` → `getStatement(...)` on the matching customer/supplier repo.
- A dedicated reporting repo is allowed **only** if the data crosses aggregates and doesn't belong to any single owner — and only with a `Technical specialization` justification.

### 3. Approved exceptions (closed list — no additions mid-flight)
- Auth / session bootstrap.
- Realtime channel subscriptions (`supabase.channel`).
- Storage uploads / streaming (`supabase.storage`).
- Edge Function streaming responses.

Each exception requires a one-line `// repo-exception: <category>` comment + a matching entry in the doc.

### 4. Migration order (lowest risk first)
1. Read-only/derived UI: badges, charts, aging tabs, statement views.
2. Settings / export / import surfaces.
3. Forms / actions (supplier form, multi-invoice settlement, quick actions).
4. Admin / platform pages (user mgmt, role limits, sync status, tenants, domain events, platform dashboard/billing, KPI dashboard).

After each cluster: Vitest + ESLint + `tsc --noEmit`. Move on only when green.

### 5. ESLint policy
- Existing `no-restricted-imports` for `@/integrations/supabase/client` stays at **`warn`** during the migration (avoids self-blocking).
- Add **`warn`-level** `no-restricted-syntax` rules covering new client surfaces outside `src/lib/repositories|services|integrations`:
  - `supabase.storage`
  - `supabase.channel`
  - `createClient(`
- At Batch A closeout (leak count = 0), flip the client-import rule from `warn` → `error`. Promotion of the three new rules is a closeout decision based on what the inventory shows.

### 6. Audit script (the official Gate)
Add `scripts/audits/check-data-access.sh` that:
- Counts hits for `supabase.from`, `.rpc(`, `.storage`, `.channel` inside `src/components` and `src/pages`.
- Counts `createClient(` outside `src/integrations/**`.
- Treats a hit as justified only if the same/previous line has `// repo-exception:` **and** the file appears in the exceptions table of the doc.
- Exits non-zero on any unjustified hit.

ESLint protects developers during editing; the audit script is the official Gate.

## Gate A (all must pass)
1. Audit script: **0 unjustified hits** for `from`, `rpc`, `storage`, `channel`, `createClient`.
2. `npx vitest run` → 1187/1187 green.
3. ESLint clean (warnings allowed, no new errors).
4. `tsc --noEmit` clean.
5. `no-restricted-imports` for `@/integrations/supabase/client` flipped from `warn` → `error`.
6. Closing report in `docs/architecture/data-orchestration-batchA.md` includes **quantitative indicators**:
   - **Reuse rate** = files routed to an existing repo ÷ total migrated. **Target ≥ 80%**.
   - **New-repo rate** = files needing a new repo ÷ total migrated. **Target ≤ 20%**.
   - Number of existing repos extended (with names).
   - Number of new repos created, **each with one of the three justification codes** above.
   - Final exception count, broken down by the four approved categories; **0 entries in any new category**.
   - Audit script output (paste).

If reuse rate < 80%, new-repo rate > 20%, any new repo carries a non-standard justification, or any exception falls outside the four categories → **stop**, do not start Batch B, and revisit Repository Layer design first.

## Out of scope (explicit)
- No `createMutation` / `createQuery` factories.
- No `useFormDialog` changes (frozen).
- No cache-policy or optimistic-update changes.
- No business validation, permission, or payload-transformation moves.

## Stop condition
At the end of Batch A, present the closing report with the quantitative indicators. Batch B is proposed in a separate turn only if every Gate A check — including the ≥80% / ≤20% thresholds and the closed exception list — passes.
