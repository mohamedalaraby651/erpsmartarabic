# UX-1E v3 — Integration Spike → Architecture Quality Gate

**Goal:** Pressure-test the UX-1D composition layer against a **mock domain layer** that simulates ERP shapes — without touching `lib/repositories`, `lib/queries`, or `integrations/supabase`. Output is no longer a "spike report" but a **formal Architecture Quality Gate** that UX-2 must consume as entry evidence: manifest, snapshots+hashes, recorded events, perf matrix, coverage matrix, regression lock, evidence index, and an explicit readiness score.

This v3 folds in all v2 decisions plus the 10 reviewer additions and the explicit per-composite Success Criteria.

---

## 0. Locked Decisions

| # | Decision | Implication |
|---|----------|-------------|
| E1 | Mock domain only | Zero imports from `lib/repositories`, `lib/queries`, `integrations/supabase`, `@tanstack/react-query`, `axios`, raw `fetch`, `zod`. |
| E2 | Composites/contracts frozen | Zero diff in `src/ui/composites/**`, `src/ui/contracts/**`, `src/ui/index.ts`. Gaps are logged, not patched. |
| E3 | Spike isolated | All spike code under `src/ui/__integration__/**`. Not re-exported from `@/ui`. |
| E4 | Disposable & dev-only | Harness route gated by `import.meta.env.DEV`; dynamic import keeps it out of prod bundle. |
| E5 | Deterministic by construction | Seeded mocks, no `Date.now()` / `Math.random()` / unseeded `randomUUID()` in `mocks/**`. |
| E6 | Manifest schema is versioned | `manifestSchema: 1` + `fingerprint: "ux1e-v3"`; fitness check rejects mismatch. |
| E7 | Recorded events are immutable | `Object.freeze` + structuredClone on capture. |
| E8 | Contract drift is hash-detectable | Every composite emits `*.contract.snapshot.json` **and** `*.contract.sha256`. |
| E9 | Regression lock is enforced | `known-findings.json` is the only allowed source of accepted gaps; new gaps fail CI. |

---

## 1. Scope

**Allowed (new):**
- `src/ui/__integration__/**` — manifest, mocks, scenarios, adapters, events, perf, harness, snapshots
- `scripts/fitness/check-integration-scope.mjs` — guards E1/E3/E4/E5/E6
- `scripts/fitness/check-adapter-coverage.mjs` — enforces coverage matrix completeness
- `scripts/fitness/check-regression-lock.mjs` — enforces `known-findings.json`
- `scripts/audits/snapshot-contracts.mjs` — generates snapshots + sha256 hashes
- `scripts/audits/build-evidence-index.mjs` — generates `ux1e-evidence/index.json`
- `scripts/audits/score-ux2-readiness.mjs` — computes UX-2 Readiness Score
- `docs/architecture/UX1E_INTEGRATION_READINESS.md` — final matrix report
- `docs/architecture/ux1e-evidence/**` — events, perf, snapshots, hashes, index, coverage, score
- `docs/adr/0005-integration-spike-protocol.md`
- `docs/risk-log/RISK-006-composite-integration-gaps.md`

**Forbidden:** `src/ui/{tokens,layout,primitives,composites,contracts}/**`, `src/lib/{repositories,queries}/**`, `src/integrations/supabase/**`, `src/components/ui/**`, `src/ui/index.ts`.

---

## 2. Deliverables

### 2.1 Integration Manifest *(+ Improvement 1 — Version Lock)*
`src/ui/__integration__/integration.manifest.ts`

```ts
export const integrationManifest = {
  manifestSchema: 1,
  fingerprint: "ux1e-v3",
  version: "1.0",
  scope: "UX-1E",
  frozenContracts: true,
  disposable: true,
  devOnly: true,
  scenarios: ["happy","empty","error","slow","large",
              "duplicateIds","nullFields","unicode"] as const,
  composites: ["DataGrid","Form","FormDialog","PageHeader",
               "StatGrid","DescriptionList",
               "EmptyState","ErrorState","LoadingState","Pagination"] as const,
  perfPoints: ["firstRender","sort","selectionToggle","dialogOpen"] as const,
} as const;
```

`check-integration-scope` verifies `manifestSchema === 1`, `fingerprint === "ux1e-v3"`, and that `frozenContracts/disposable/devOnly` are literal `true`.

### 2.2 Seeded Mock Domain
`src/ui/__integration__/mocks/`
- `seed.ts` — `mulberry32(seed)` PRNG, `seededId(prefix, n)` → `customer-000001`, `invoice-000123`.
- `customers.mock.ts` (200), `invoices.mock.ts` (500), `products.mock.ts` (150).
- `delays.ts` — `withLatency(ms, signal?)`; deterministic via fake timers in tests.
- `errors.ts` — discriminated `ValidationError | NetworkError | PermissionError` (types only).

### 2.3 Scenario Registry *(+ Improvement 6 — Scenario Metadata)*
`src/ui/__integration__/scenarios/index.ts`

Each scenario exports both data and metadata:
```ts
export const happy = {
  name: "happy",
  meta: { complexity: "normal", expectedRows: 200, rtl: false, nullable: false, duplicateKeys: false },
  rows, columns, formInitial,
};
// plus: empty, error, slow, large, duplicateIds, nullFields, unicode
export const scenarios = { happy, empty, error, slow, large, duplicateIds, nullFields, unicode } as const;
export type ScenarioName = keyof typeof scenarios;
```

Edge scenarios:
- `duplicateIds` — same id appears twice → asserts DataGrid `getRowId` correctness.
- `nullFields` — `phone = null`, `name = ""` → no crashes; logical fallback.
- `unicode` — mixed AR/EN/digits ("شركة الأمل ٢٠٢٦ — Acme Co.") → RTL via logical props.

### 2.4 Adapters
`src/ui/__integration__/adapters/`
- `useMockList<T>(scenario)` → conforms to `DataGridContract`
- `useMockForm<T>(scenario)` → conforms to `FormContract`
- `useMockOverlay()` → consumes `OverlaySpec`, renders into a local mock Shell slot

### 2.5 Event Recorder *(+ Improvement 3 — Immutable)*
`src/ui/__integration__/events/EventRecorder.ts`

```ts
record(event) {
  const frozen = Object.freeze(structuredClone(event));
  this.buffer.push({ t: performance.now() - this.t0, event: frozen });
}
```

`dump()` → JSON; harness has "Export events" button. Tests assert `Object.isFrozen` on every entry.

### 2.6 Performance Probes *(+ Improvement 5 — Perf Metadata)*
`src/ui/__integration__/perf/probes.ts` measures `firstRender`, `sort`, `selectionToggle`, `dialogOpen` via `performance.now()`.

Output `perf.<scenario>.json`:
```json
{
  "environment": { "node": "...", "vitest": "...", "jsdom": "...", "seed": 1234 },
  "scenario": "large",
  "measurements": { "firstRender": 14.2, "sort": 3.1, "selectionToggle": 1.8, "dialogOpen": 2.4 }
}
```

### 2.7 Harness
`src/ui/__integration__/harness/`
- `IntegrationHarnessPage.tsx` — scenario switcher, all composites, event panel, perf panel, export button.
- `route.ts` — `registerIntegrationHarnessRoute(router)`; mounted only via:
  ```ts
  if (import.meta.env.DEV) {
    const { registerIntegrationHarnessRoute } =
      await import("@/ui/__integration__/harness/route");
    registerIntegrationHarnessRoute(router);
  }
  ```

### 2.8 Contract Snapshots + Hashes *(+ Improvement 4)*
`scripts/audits/snapshot-contracts.mjs` emits per composite:
- `<Composite>.contract.snapshot.json` — canonical JSON of public prop/event/contract types
- `<Composite>.contract.sha256` — hash of canonical snapshot

CI fast-path: compare hashes; on mismatch, show snapshot diff. Hashes are listed in the final report.

### 2.9 Adapter Coverage Matrix *(+ Improvement 2)*
`scripts/audits/build-adapter-coverage.mjs` parses tests/harness usage and emits `ux1e-evidence/adapter-coverage.json`:
```json
{ "DataGrid": ["happy","empty","large","duplicateIds","unicode"],
  "Form":     ["happy","error","slow"],
  "FormDialog": ["happy"],
  "PageHeader": ["happy","empty"] }
```
`check-adapter-coverage.mjs` requires every `manifest.composites[i]` to appear with ≥1 scenario; gaps fail CI.

### 2.10 Regression Lock *(+ Improvement 7)*
`docs/architecture/ux1e-evidence/known-findings.json` — explicit accepted gaps:
```json
[
  { "id": "RISK-006-01", "severity": "minor", "composite": "DataGrid",
    "summary": "No virtualization at 5k rows; acceptable for UX-1E.",
    "owner": "UI Architecture", "deferredTo": "UX-1F" }
]
```
`check-regression-lock.mjs` cross-references RISK-006 findings; **new** findings absent from this file fail CI.

### 2.11 Evidence Index *(+ Improvement 8)*
`scripts/audits/build-evidence-index.mjs` writes `ux1e-evidence/index.json`:
```json
{
  "generatedAt": "...", "commit": "<sha>",
  "manifest": { "fingerprint": "ux1e-v3", "manifestSchema": 1 },
  "events":     ["events.happy.json", "..."],
  "perf":       ["perf.happy.json", "..."],
  "snapshots":  ["DataGrid.contract.snapshot.json", "..."],
  "hashes":     { "DataGrid": "sha256:...", "Form": "sha256:..." },
  "coverage":   "adapter-coverage.json",
  "knownFindings": "known-findings.json",
  "readiness":  "ux2-readiness.json"
}
```

### 2.12 UX-2 Readiness Score *(+ Improvement 10)*
`scripts/audits/score-ux2-readiness.mjs` aggregates fitness + tests + coverage + perf into `ux1e-evidence/ux2-readiness.json`:
```json
{
  "scores": {
    "Contract Stability":     100,
    "Adapter Isolation":      100,
    "Event Purity":           100,
    "Overlay Ownership":      100,
    "State Isolation":         95,
    "Performance Confidence":  92
  },
  "overall": 97.8,
  "verdict": "UX-2 READY"  // or "READY WITH RISKS" | "BLOCKED"
}
```
Thresholds: ≥95 overall + zero blocker findings → `UX-2 READY`; 85–94 or only `minor`/`major` findings → `READY WITH RISKS`; any `blocker` → `BLOCKED`.

### 2.13 Per-Composite Success Criteria *(reviewer "last note")*
Codified both in `UX1E_INTEGRATION_READINESS.md` §4 and in `ux1e-evidence/success-criteria.json` (machine-checked by the readiness scorer):

| Composite | Success Definition |
|---|---|
| **DataGrid** | No contract change; every event conforms to `CompositeEvent`; renders 5000 rows without runtime errors; sort/selection/density are UI-state only. |
| **Form** | Supports `happy`, `error`, `slow` scenarios with no prop changes; lifecycle phase transitions emitted correctly; never references a data layer. |
| **FormDialog** | Emits `OverlaySpec` only; owns zero overlay runtime state (no portal/focus trap/escape inside the composite). |
| **PageHeader** | Consumes derived aggregates as plain props; no data-source coupling; renders correctly in RTL. |
| **StatGrid / DescriptionList** | Pure presentation of primitive aggregates; no async, no fetch, no formatters tied to domain types. |
| **EmptyState / ErrorState / LoadingState** | Render under their respective scenarios without prop drift; no implicit i18n dependency. |
| **Pagination** | Pure UI controller; emits `grid.page.change` envelope; never decides server pagination strategy. |

### 2.14 Governance
- **ADR-0005 — Integration Spike Protocol** — codifies E1–E9.
- **Fitness checks (new):** `check-integration-scope`, `check-adapter-coverage`, `check-regression-lock`.
- All UX-1A→1D fitness checks remain green.

### 2.15 Tests
Under `src/ui/__integration__/__tests__/`:
- **Adapter contract tests** — typed + shallow runtime shape assertions.
- **Adapter boundary tests** *(Improvement 9 of v2)* — parse adapter sources; assert no forbidden imports.
- **Scenario rendering tests** — all 8 scenarios mount cleanly; recorder collects ≥1 event for interactive scenarios.
- **Event envelope conformance** — every recorded event matches `CompositeEvent<string, EventPayload>` **and** is frozen.
- **Edge-scenario tests** — duplicateIds / nullFields / unicode.
- **Perf smoke** — informational per scenario; values written to `perf.*.json`.
- **Coverage assertion** — `adapter-coverage.json` covers every composite in the manifest.

### 2.16 Findings Report
`docs/architecture/UX1E_INTEGRATION_READINESS.md` — table-driven sections:

1. Executive Summary (+ readiness verdict)
2. Architecture Validation (E1–E9 status)
3. Scenario Matrix
4. **Per-Composite Success Criteria** (table from §2.13)
5. Composite Matrix
6. Performance Matrix (with environment metadata)
7. Event Matrix (+ frozen-event assertion)
8. State Isolation
9. **Contract Findings** (snapshot diff + sha256 list)
10. **Adapter Coverage Matrix**
11. **Risk Classification** — entries use structured IDs `RISK-006-01`, `RISK-006-02`, … *(Improvement 9)*
12. **UX-2 Readiness Score** (from `ux2-readiness.json`)
13. UX-2 Entry Checklist
14. Appendix — links via `ux1e-evidence/index.json`

---

## 3. Invariants

| ID | Invariant | Enforced by |
|----|-----------|-------------|
| E1 | Mock domain has zero real-data-layer deps | `check-integration-scope` + adapter boundary tests |
| E2 | Composites/contracts unchanged | git diff + UX-1D fitness suite |
| E3 | Spike never leaks to public surface | `check-integration-scope` |
| E4 | Harness is dev-only | `check-integration-scope` (DEV-guard grep) |
| E5 | Mock data deterministic | `check-integration-scope` (bans `Date.now`/`Math.random`/`crypto.randomUUID` in `mocks/**`) |
| E6 | Manifest schema/fingerprint locked | `check-integration-scope` |
| E7 | Recorded events immutable | Vitest `Object.isFrozen` assertions |
| E8 | Contract drift hash-detected | `snapshot-contracts.mjs` + committed `*.sha256` |
| E9 | No silent regressions | `check-regression-lock` vs `known-findings.json` |

---

## 4. Acceptance Criteria

- Manifest (v3) + mocks + scenarios (incl. 3 edge) + adapters + recorder + perf probes + harness present under `src/ui/__integration__/**`.
- All 8 scenarios render at `/__integration__/ux1e` (dev).
- All three new fitness checks PASS; all UX-1A→1D fitness PASS; contract snapshots + hashes match committed values.
- `tsc --noEmit` = 0; `eslint` = 0.
- Vitest: ≥18 new tests green (adapter contract, boundary, scenarios, edge, envelope+frozen, perf, coverage).
- Evidence committed under `docs/architecture/ux1e-evidence/`: per-scenario `events.*.json` + `perf.*.json`, per-composite snapshots + sha256, `adapter-coverage.json`, `known-findings.json`, `success-criteria.json`, `ux2-readiness.json`, `index.json`.
- `UX1E_INTEGRATION_READINESS.md` published with all 14 sections.
- RISK-006 opened with structured sub-IDs; ADR-0005 + ADR INDEX updated.
- Zero diff in `src/ui/composites/**`, `src/ui/contracts/**`, `src/ui/index.ts`.
- **Final verdict in `ux2-readiness.json` is `UX-2 READY` or `READY WITH RISKS` (never `BLOCKED`)** to close the phase.

---

## 5. Out of Scope

- Real repositories/queries → **UX-2**
- Runtime validation / Zod → **UX-2 (conditional)**
- Legacy `src/components/ui/**` deprecation → UX-2 entry gate
- Virtualization → UX-1F (only if perf matrix flags it)
- Storybook → RISK-002 deferred

---

## 6. Execution Order

1. ADR-0005 + manifest (v3 w/ schema+fingerprint) + `check-integration-scope` (incl. E5/E6 guards)
2. Seeded mocks (seed, customers, invoices, products, delays, errors)
3. Scenario Registry + metadata + edge scenarios (duplicateIds, nullFields, unicode)
4. Adapters (`useMockList`, `useMockForm`, `useMockOverlay`)
5. Immutable Event Recorder + Perf Probes (+ environment metadata)
6. Harness page + dev-only dynamic route
7. Snapshot generator + sha256 hashes; commit initial snapshots
8. Coverage matrix generator + `check-adapter-coverage`
9. Regression lock (`known-findings.json`) + `check-regression-lock`
10. Vitest suites (contract, boundary, scenarios, edge, frozen-envelope, perf, coverage)
11. Run full fitness + tsc + eslint; capture artifacts
12. Evidence index generator → `ux1e-evidence/index.json`
13. UX-2 readiness scorer → `ux2-readiness.json` (+ Success Criteria evaluation)
14. Author `UX1E_INTEGRATION_READINESS.md` from artifacts
15. Open RISK-006 (with `RISK-006-01..N`); UX-2 entry-gate handoff

---

## 7. Closure Evidence

- `scripts/audits/output/fitness/check-integration-scope.json`
- `scripts/audits/output/fitness/check-adapter-coverage.json`
- `scripts/audits/output/fitness/check-regression-lock.json`
- Full re-run of UX-1A→1D fitness (PASS, unchanged)
- `ux1e-evidence/`: snapshots + `.sha256`, `events.*.json` × 8, `perf.*.json` × 8 (with env metadata), `adapter-coverage.json`, `known-findings.json`, `success-criteria.json`, `ux2-readiness.json`, `index.json`
- Vitest report
- `docs/architecture/UX1E_INTEGRATION_READINESS.md`
- `docs/risk-log/RISK-006-composite-integration-gaps.md` (with structured sub-IDs)
- ADR INDEX updated with ADR-0005
- Git diff proving zero changes under composites/contracts/public surface
