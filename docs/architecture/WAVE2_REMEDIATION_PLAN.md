# Wave 2 Remediation Plan

**Status:** Active (Wave 2 Closure).
**Governed by:** ADR-0027, ADR-0028, ADR-0030.
**Objective:** Convert Wave 2 & Wave 2.5 from "ready in theory" to "engineered closed".
No new features. No new runtime deps. No DB or business-logic changes.

Exit of this plan seals `BASELINE-UX3A-002` in `Locked` state and unblocks
Wave 2.5.

---

## Phase A — Discovery Backlog

Convert the 6 Wave 2 discovery reports into a categorized backlog. Each
item is tagged: **auto-fix**, **manual**, or **deferred (ADR)**.

Source: `scripts/audits/output/wave2-discovery/*.json`.

### A.1 Design System Inventory findings

Report: `design-system-inventory.md` — totals: 216 hex, 1 rgb, 5 hsl,
10 font-family, 9 box-shadow, 422 arbitrary-px.

| Finding | Count | Class | Owner script |
|---|---|---|---|
| Hardcoded hex colors in feature code | 216 | auto-fix (map → semantic token) + manual (design review for uncovered shades) | `scripts/fixes/fix-design-tokens.mjs` |
| Hardcoded `rgb(...)` | 1 | auto-fix | `fix-design-tokens.mjs` |
| Non-token `hsl(...)` literals | 5 | manual (audit each; keep only in `index.css`) | — |
| Hardcoded `font-family:` | 10 | auto-fix (→ `var(--font-sans)`) | `fix-typography.mjs` |
| Non-token `box-shadow:` | 9 | auto-fix (→ `var(--shadow-*)`) | `fix-typography.mjs` (elevation pass) |
| Arbitrary `p-[Npx]` / `m-[Npx]` | 422 | auto-fix (snap to 4-pt grid) + deferred cases (ADR if snap breaks layout) | `fix-spacing.mjs` |

### A.2 Component duplication

Report: `component-duplication.json` — 364 duplicate pairs.

- Similarity ≥ 0.90 → **auto-fix** (mechanical dedupe to canonical primitive in `src/ui/primitives/**`).
- Similarity 0.75–0.89 → **manual** (design review; may consolidate into composite with variants).
- Similarity < 0.75 → **deferred** (documented in `design-decisions/`).

### A.3 UI dependency cycles

Report: `ui-dep-graph.json` — `cycleCount: 2`.

1. `src/ui/composites/index.ts ↔ src/ui/composites/state/LoadingState.tsx ↔ src/ui/index.ts` — **manual** (remove barrel round-trip; LoadingState imports from primitives directly).
2. `src/components/customers/details/CustomerKPICards.tsx ↔ CustomerTimelineDrawer.tsx` — **manual** (lift shared props to `src/components/customers/details/types.ts`).

Both must be resolved before Baseline lock (`Phase J`).

### A.4 Rendering cost

Report: `rendering-cost.json` — top 100 heavy components.

- Pages > 200 LOC without `React.lazy` → **auto-fix** where safe (`fix-lazy-loading.mjs`, opt-in).
- Components > 200 LOC without any `memo`/`useMemo`/`useCallback` → **manual** review; no bulk memoization.

### A.5 UI complexity & ui-kit usage

- `ui-kit` frozen imports outside allowlist → **quality gate** (already enforced by `check-no-new-ui-kit-imports` in Wave 3).
- Complexity > threshold → **manual** split, tracked in `design-decisions/`.

---

## Phase B — Automation (Fix Scripts)

Located under `scripts/fixes/`. All scripts are **idempotent**, produce
a JSON `diff-report` in `scripts/audits/output/wave2-fixes/`, and default
to `--dry-run`. `--write` is required to persist changes.

| Script | Purpose |
|---|---|
| `fix-design-tokens.mjs` | Map hex/rgb literals to semantic tokens via a curated palette map (`scripts/fixes/_maps/color-map.json`). Unknown colors written to `unmapped.json` for manual review. |
| `fix-spacing.mjs` | Snap arbitrary `p-[Npx]` / `m-[Npx]` / `gap-[Npx]` to the nearest Tailwind 4-pt step. Emit `deferred.json` when snap delta > 2px. |
| `fix-typography.mjs` | Rewrite hardcoded `font-family` and `box-shadow` to design tokens. |
| `fix-import-order.mjs` | Enforce import ordering: React → external → `@/kernel` → `@/platform` → `@/ui` → `@/components` → relative. |

Scripts run on `src/**` excluding `src/kernel/**`, `src/platform/**`,
`src/ui/tokens/**`, and `src/index.css` (allowlists).

---

## Phase C — Quality Gates (New Fitness Checks, warn mode)

Added under `scripts/fitness/`, registered in `run-all.mjs` under PENDING,
enforcing after their remediation lands.

| Check | Rule |
|---|---|
| `check-component-loc-budget` | Max LOC per component: primitives 250, composites 400, feature 600. |
| `check-component-props-budget` | Max exported props per component: 12. |
| `check-jsx-nesting-depth` | Max JSX nesting: 8 levels. |
| `check-no-inline-styles` | No `style={{...}}` outside `src/ui/primitives/**` allowlist. |
| `check-icon-source` | Icons imported only from `lucide-react`. |
| `check-css-modules-scope` | `*.module.css` allowed only under `src/ui/**`. |
| `check-no-any-in-ui` | Ban `: any` and `<any>` in `src/ui/**` and `src/components/**`. |

---

## Phase D — UI Architecture Audit

`scripts/audits/ui-architecture-health.mjs` — emits
`scripts/audits/output/wave2-discovery/ui-architecture-health.json`.

Metrics per file/module:

- **Coupling** — outbound imports from feature code.
- **Cohesion** — ratio of intra-module to inter-module edges.
- **Fan-in / Fan-out** — reverse & forward import counts.
- **Layer violations** — deep imports across `src/ui/**` boundaries.
- **Cycles** — SCC size ≥ 2.
- **Stability** — `I = Ce / (Ce + Ca)` per module (Martin's metric).

Fails Baseline lock if: cycles > 0, layer violations > 0, or any module
with `I > 0.8` **and** `Fan-in > 10`.

---

## Phase E — Token Coverage

`scripts/audits/token-coverage.mjs` — emits
`scripts/audits/output/wave2-discovery/token-coverage.json`.

For each token axis, reports:

- Total references (`var(--...)` + Tailwind mapped classes).
- Hardcoded competitors in feature code.
- Coverage % = tokenized / (tokenized + hardcoded).

Axes: colors, typography, spacing, elevation, motion, radius, border,
opacity, transitions, z-index, focus-ring.

Target: ≥ 95% per axis at Baseline lock; hard-fail if any axis < 90%.

---

## Phase F — Wave 2.5 Primitive Contract

Every primitive in `src/ui/primitives/**` must ship these traits, verified
by a contract test (`src/ui/primitives/__tests__/primitiveContract.test.tsx`):

- Loading state (or documented N/A).
- Disabled state (or documented N/A).
- Error state (form primitives).
- Focus / focus-visible ring using `--shadow-focus`.
- Hover state via tokens.
- Pressed / active state.
- Keyboard navigation matrix (Radix defaults suffice for wrappers).
- RTL: uses logical properties only (`ms-*`, `me-*`, `ps-*`).
- Dark mode: passes contrast in `data-theme="dark"`.
- High-contrast readiness: passes in `data-theme="high-contrast"`.

Non-conformant primitives are flagged in
`scripts/audits/output/wave2-discovery/primitive-contract.json`.
This is the **Wave 2.5** deliverable; Wave 2 closure only requires the
report and remediation plan per primitive.

---

## Phase G — Accessibility Audit

`scripts/audits/accessibility-audit.mjs` — emits
`scripts/audits/output/wave2-discovery/accessibility-audit.json`.

Static checks (not lint-only):

- Contrast pairs (`text-*` on `bg-*` in the same subtree, resolved through tokens).
- `aria-label` / `aria-labelledby` presence on icon-only buttons.
- `aria-describedby` on inputs with helper text siblings.
- `aria-expanded` on toggler patterns.
- `tabindex` values > 0 forbidden.
- Keyboard nav: verified via Radix wrapper detection.
- Focus trap: modals must render inside Radix `Dialog`.
- Heading hierarchy: no skipped levels per route file.

---

## Phase H — Performance Audit

`scripts/audits/performance-audit.mjs` — emits
`scripts/audits/output/wave2-discovery/performance-audit.json`.

- `React.memo` coverage (heavy leaf components).
- Lazy loading coverage (routes).
- `<Suspense>` boundary coverage.
- Virtualization candidates (lists rendering > 50 rows).
- Top bundle contributors (via existing `bundle-report.mjs`).
- Render frequency hotspots (heuristic: hooks that call setState in effect without deps).

Baseline target: routes lazy ≥ 80%, Suspense present on all lazy routes.

---

## Phase I — Authoring Documentation

Under `docs/architecture/authoring/`:

- `COMPONENT_AUTHORING_GUIDE.md`
- `TOKEN_AUTHORING_GUIDE.md`
- `THEME_AUTHORING_GUIDE.md`
- `VARIANT_NAMING_GUIDE.md`
- `REVIEW_CHECKLIST.md`
- `UI_CODE_STYLE_GUIDE.md`

Each guide is short, prescriptive, and cross-linked. They become the
canonical answer to "how do I add / change X" instead of tribal knowledge.

---

## Phase J — Baseline Lock

`BASELINE-UX3A-002` flips from `pending` → `Locked` **only when all**:

- [ ] 5 Wave 2 fitness checks in `enforcing` mode.
- [ ] 7 Phase-C fitness checks in `enforcing` mode.
- [ ] Zero new violations vs. baseline snapshot.
- [ ] Zero UI-layer circular dependencies.
- [ ] Zero cross-layer import violations.
- [ ] All Vitest suites green.
- [ ] `bun run build` succeeds.
- [ ] Scorecard within targets (`scorecard-ux3a-wave2.json`).
- [ ] All ADRs & design-decisions updated.
- [ ] `MANIFEST.json` and `PROJECT_MAP.md` refreshed.
- [ ] New architecture fingerprint emitted.
- [ ] `ux3a-wave2-lock.json` → `state: closed`, `closedAt` set.

---

## Post-closure order

1. Wave 2.5 — UI API standardization (Primitives + Composites + Layout + Contracts, backward-compatible).
2. Wave 3 — Interaction Framework, begin `ui-kit` replacement.
3. Wave 4 — UX State System, delete `ui-kit`.
4. Wave 5–9B — Data presentation, dashboards, view models, perf, Read Model wiring, real-time.
5. Wave 10 — MCP Foundation resume.
