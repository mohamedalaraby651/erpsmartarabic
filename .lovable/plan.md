## Phase A2.5 — Step 1 POC: `supplierQueryService` (Validation Experiment)

**Framing change (per review):** This is **not** "building a Query Layer." This is a controlled experiment that asks one question:

> Does the UI actually need a Read Model separation, or was the Repository sufficient?

The POC is reversible. The architecture is not committed until Step 1 results pass a measurable validation gate.

---

### Hard rules (binding — any violation = immediate stop)

1. **Zero Repository public-API changes.** No new methods on `supplierRepository`, no signature changes.
2. **Zero business logic in `supplierQueryService`.** No validation, permissions, calculations beyond shape/aggregation needed for the view, no defaulting of business values.
3. **QueryService must not become a Shadow Repository.** Forbidden patterns:
   - A method that is a thin pass-through to a single table with no join/aggregation → fails the POC (means Repository was sufficient).
   - Filtering logic that duplicates an existing repo filter.
   - Re-implementing logic already living in `supplierRepository`.
4. **Single source of truth per read.** If a read shape already exists on `supplierRepository` (e.g. `listNotes`), the QueryService **must not** offer a parallel version. Compose, don't duplicate.
5. **No writes, no mutations, no cache invalidation** inside QueryService.
6. **No new RPCs, no DB changes, no `queryKeys.ts` top-level scope additions.**

---

### Scope (3 supplier-domain files only)

1. `src/components/suppliers/SupplierActivityTab.tsx` → `supplierQueryService.listActivity(supplierId)`
2. `src/components/suppliers/SupplierProductsTab.tsx` → `supplierQueryService.listAggregatedProducts(supplierId)`
3. `src/components/suppliers/SupplierRatingTab.tsx` → `supplierQueryService.listNotesWithAuthor(supplierId)` (read path only; the `addNoteMutation` continues to call `supplierRepository.createNote`)

`CustomerPinnedNote.tsx` is **explicitly deferred** to Step 3 (cross-domain test case, not part of POC).

---

### Files added / changed

**New:**
- `src/lib/queries/supplierQueryService.ts` — 3 methods, 3 exported view interfaces.
- `docs/architecture/data-orchestration-batchA.md` — new section "Query Layer POC — Step 1 Results" with the measurement tables below.

**Edited:**
- The 3 UI files above (read path only; mutations untouched).

**Untouched:**
- `src/lib/repositories/supplierRepository.ts` (zero changes).
- `src/lib/queryKeys.ts` (reuse existing `suppliers.*` keys).
- All other repositories, hooks, services.

---

### Measurement criteria (objective, recorded before/after)

Each metric is measured per file and aggregated. Recorded in the POC results doc.

**A. Complexity reduction (must show net improvement in ≥2 of 3 files):**

| Metric | Definition | Target |
|---|---|---|
| `supabase.from()` calls in UI file | Direct client refs | → 0 in all 3 |
| Lines of data-fetch code in UI | `useQuery` body LOC | ↓ in ≥2 files |
| In-component data shaping LOC | Map/reduce/aggregate in component body | ↓ in ≥2 files |
| Cognitive load (imports of `supabase`, types, helpers) | Count of data-layer imports | ↓ in ≥2 files |

**B. QueryService quality (all must hold):**

| Metric | Target |
|---|---|
| Methods that are pure pass-throughs to one table with no join/aggregation | **0** |
| Methods duplicating an existing `supplierRepository` read | **0** |
| Methods containing business validation / permission / calculation | **0** |
| Methods >60 LOC | flagged for review (not auto-fail) |
| Tables joined per method | recorded; >4 flagged |

**C. Duplication audit (must hold):**

| Check | Target |
|---|---|
| Two code paths returning the same read shape (repo + query) | **0** |
| Shared filter logic copy-pasted between repo and query | **0** |

**D. Architectural integrity (must hold):**

| Check | Target |
|---|---|
| Repository public API changes | **0** |
| New repositories | **0** |
| Business logic moved into query service | **0** |
| New exception categories | **0** |
| Audit script unjustified hits removed | **3** |
| `queryKeys.ts` top-level scopes added | **0** |

**E. Quality gates (must hold):**

| Check | Target |
|---|---|
| Vitest | green (baseline maintained) |
| ESLint | no new errors |
| `tsc --noEmit` | clean |
| `scripts/audits/check-data-access.sh` | exits 0 |

---

### Completion criteria (Step 1 is "done" only if ALL hold)

1. All 3 files migrated, read path goes through `supplierQueryService`.
2. **Measurement A** shows net complexity reduction in ≥2 of 3 files. If 0–1 files improve, POC is **inconclusive** → Step 3 likely outcome = 3C (rollback).
3. **Measurement B, C, D, E** all pass with zero violations.
4. POC results section in `docs/architecture/data-orchestration-batchA.md` is filled with actual measured numbers (not estimates).
5. Three review questions explicitly answered in the doc:
   - Q1: Did any UI need a shape the query service couldn't express cleanly?
   - Q2: Did any method drift toward business rules / shadow-repository behaviour?
   - Q3: Is the added file/method count proportionate to the readability/duplication win?

---

### Stop conditions (during execution)

Any of the following triggers **immediate halt** and a written reclassification note instead of "fixing it inline":

- A QueryService method needs business logic to work.
- A QueryService method ends up being a thin wrapper over `supabase.from('x').select('*')`.
- A read already exists on `supplierRepository` and would need to be duplicated.
- A UI file's shape can't be expressed without changing the Repository.
- A migration requires editing `supplierRepository.ts`.

On halt: document the trigger, the file, and the smallest possible diagnosis. Do not proceed to file 2 or 3 until the halt is reviewed.

---

### Decision outcomes after Step 1

Step 1 results map to one of three Step 3 outcomes (no work happens in Step 3 — review only):

| POC result | Step 3 recommendation |
|---|---|
| Measurement A passes + B/C/D/E clean | **3A — Proceed to `reportsQueryService` (Step 2).** Query Layer hypothesis validated on supplier domain. |
| Measurement A inconclusive but B/C/D/E clean | **3B — Pause Query Layer. Re-evaluate A3 as Repository Extends.** Layer is technically correct but doesn't earn its complexity cost. |
| Any B/C/D/E violation, or halt triggered | **3C — Rollback Step 1. Repository Layer was sufficient; the gap is in Read Modeling at the DB level (views/RPCs), not at the application layer.** |

---

### Out of scope (Step 1)

- `reportsQueryService`, `customerQueryService` — not built, not designed in detail.
- `CustomerPinnedNote.tsx` — deferred.
- `reportsRepository.cashFlow` — untouched.
- Any A3 Extend work.
- `createMutation` / `createQuery` factories, `useFormDialog`, cache topology, optimistic updates.

---

### Approval requested

- Confirm Step 1 POC as scoped (3 supplier files, read paths only).
- Confirm all hard rules and stop conditions.
- Confirm: **no auto-continuation to Step 2** regardless of Step 1 outcome — explicit review required.
