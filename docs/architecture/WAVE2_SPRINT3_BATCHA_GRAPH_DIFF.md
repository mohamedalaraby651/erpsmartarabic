# Sprint 3.1 · Batch A — Graph Diff

Baseline fingerprint: `architecture-fingerprint.json` @ `6e4bcc7568111316161999d71e5f84aa4690f5606dd4220521fd9698884822d2` (2026-07-04).  
New fingerprint: see `architecture-fingerprint.json` (post-BatchA).

## Added Edges (new module dependencies)

31 new UI-layer edges targeting `src/application/queries/{customers|suppliers|products|customer-search}`:

- `pages/**` → `application/queries/*`: 4 edges
- `components/**` → `application/queries/*`: 27 edges

## Removed Edges (violations eliminated)

32 UI-layer edges previously targeting `src/lib/repositories/*` were removed:

- `pages/**` → `lib/repositories/{customerRepository,supplierRepository}`: 4 edges
- `components/**` → `lib/repositories/{customerRepository,supplierRepository,productRepository,customerSearchRepo}`: 28 edges

## Changed Ownership

None. All 25 targeted files remain in their canonical folders.

## Barrel Changes

- **New barrels:**
  - `src/application/queries/index.ts` (namespaced re-export of 4 facades)
  - `src/application/queries/customers.ts`
  - `src/application/queries/suppliers.ts`
  - `src/application/queries/products.ts`
  - `src/application/queries/customer-search.ts`
- **Deleted barrels:** None.
- **Modified barrels:** None (`src/ui/index.ts` untouched; export count = 52).

## Cycle Diff

| | Before | After | Δ |
|---|---:|---:|---:|
| Total cycles | 6 | 6 | 0 |
| UI cycles | 0 | 0 | 0 |
| New cycles introduced | — | 0 | 0 |
| Cycles broken | — | 0 | 0 |

## FanIn / FanOut Deltas

- `src/lib/repositories`: fanIn `61 → 57` (facade absorbs UI edges).
- `src/application/queries` (new): fanIn `0 → 31`, fanOut = 4 (each facade re-exports its underlying repo).
- No file crossed FanOut ≥ 12 as a result of Batch A.
- No file previously ≥ 12 saw its FanOut increase.

## Invariants

- W1-INV-1 … W1-INV-12: **preserved**.
- `domain → ui` violations remain at 0 ✅.
- No writes under `src/kernel/**`, `src/platform/**`, `src/domain/**`, `src/infrastructure/**` ✅.
