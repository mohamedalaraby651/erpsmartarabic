# G0 — Evidence Integrity Gate · Decision Record

| Field | Value |
|---|---|
| Gate | **G0 — Evidence Integrity** (evidence only, *not* codebase health) |
| Record ID | `G0-NAZRA-001` |
| Baseline under test | `BASELINE-NAZRA-002` (SEALED) |
| Parent baseline | `BASELINE-NAZRA-001` @ `a33f49b9a593967dc5d623f018768de85a0d337c` |
| Sealed source commit | `31052763bf683cd3b1b0467c48c619df116c961c` |
| Evidence revision (HEAD at G0) | `1bf0b5f126ee40982512729939d7c658cfc1df62` |
| Composite SHA-256 | `1b4fafd5d784c0b28daa3fb25653368adc11745b38e5523852b563d4e24cdf87` (28 entries) |
| Scope hash | `eab102bd71ccd916f5cf32284d27d0b03ed32008b0849b18687740f7fa32eb84` (unchanged) |
| Machine-readable | `scripts/audits/output/g0-evidence-integrity.json` |
| Certification | **NOT CERTIFIED** — G0 is an evidence gate, not a certification |

> Decision rule applied: *G0 asks whether the evidence truthfully and reproducibly
> represents the current state, not whether the system is healthy.*
> Documented known failures do **not** fail G0; lineage, freshness or hash
> inconsistency does.

---

## 0. Preflight (independent unit — outside Batch B, outside scope hash)

`PRE-TS-001` recurred a **fifth** time before evidence regeneration (platform
regeneration of `src/integrations/supabase/previewAuthStorage.ts`, `TS7011` @ 79/83).
Handled exactly as contracted: an isolated preflight micro-change (return-type
annotations only, zero behavioural change), executed **before** any evidence run,
never bundled with Batch B, zero scope-hash impact. The recurrence is recorded, not
hidden — see §3, item 15.

---

## 1. The sixteen G0 checks

| # | Check | Method | Result |
|---:|---|---|---|
| 1 | Source revision | `git rev-parse HEAD` | `1bf0b5f1` — resolvable, matches evidence run |
| 2 | Baseline identity | `baseline-nazra-002.json` tag/phase/seq | `BASELINE-NAZRA-002` · NAZRA · 002 ✅ |
| 3 | Parent baseline | Manifest + baseline doc | `BASELINE-NAZRA-001 @ a33f49b9` — commit exists, resolves to `a33f49b9a593967dc5d623f018768de85a0d337c` ✅ |
| 4 | Evidence freshness | Full evidence set **re-executed at G0 time**, not reused | ✅ fresh |
| 5 | Evidence lineage | `a33f49b9` → `31052763` (seal) → `1bf0b5f1` (G0); diff since seal = governance/evidence artifacts + PRE-TS-001 preflight only | ✅ unbroken |
| 6 | Artifact hashes | `check-baseline-tag-integrity.mjs` | `BASELINE-NAZRA-002 ok (28 entries)`; UX2B-001, UX3A-000, UX3A-001 also ok; 2 placeholders skipped ✅ |
| 7 | Dependency lock hash | SHA-256 `package-lock.json` = `36702e53833f5c91936509d182fa2426a14429a99145bd0b44dddc88456793b0`; `bun.lockb` = `57954bd8ba6493ea7d74faa1381295829ff33ed882e78e1a7bf9166fa2530203`; `package.json` = `22df4faa92a3ef5ec99f7db637ca2ec31df8c378d80d9536223b16d548e13681` | ✅ recorded |
| 8 | Build hash | `npx vite build` exit 0; aggregate SHA-256 of `dist/` = `4db9cb552efb38d9e54344e98414a5f4dc319f8938177631ee904aac691bc581` | ✅ |
| 9 | Test snapshot | `npx vitest run` exit 1 — **1581 passed / 1 failed / 5 skipped**; files 154 passed / 3 failed / 1 skipped | ✅ matches sealed snapshot exactly |
| 10 | Fitness snapshot | `run-all.mjs` exit 0 — active 32 · pending 9 · **failures 0** | ✅ matches |
| 11 | Architecture snapshot | `dep-graph.mjs` — 1210 modules · 6 cycles · **155** layer violations · UI cycles 0 · `pages→repositories` 11; inventory modules 174 / files 1210 | ✅ matches |
| 12 | ADR state | 18 `Accepted` ADRs hashed into the manifest; all re-hash clean | ✅ |
| 13 | Open P0 findings | None open at P0. Open items are `PRE-PDF-001` (Deferred), `PRE-TS-001` (Recurring/Drift), `RISK-007` (separate security track, 6 items, 5 proofs outstanding) | ✅ all visible |
| 14 | `PRE-PDF-001` visibility | Present in baseline §5, lock `openFindings`, and this record. Test suite explicitly **not** described as green | ✅ visible, unrepaired |
| 15 | `PRE-TS-001` recurrence visibility | Recurrence **#5** recorded here (seal recorded #4). Root cause still uninvestigated; carried to Phase 0 as platform boundary ownership | ✅ visible, symptom-only handling declared |
| 16 | No unauthorized changes | `git diff --name-only a33f49b9 -- src | sort` = **25 files == Approved set**; item-level assertion `MATCH`; deferred rows 11 untouched; working tree clean | ✅ |

## 2. Fresh evidence commands (executed at G0 time)

```text
npx tsgo -p tsconfig.app.json --noEmit                      exit 0   (after preflight)
npx vite build                                              exit 0   (chunk-size warnings only)
npx vitest run                                              exit 1   1581 pass / 1 fail / 5 skip · 3 failing files
npm run lint                                                exit 1   904 problems — 39 errors / 865 warnings
node scripts/fitness/run-all.mjs                            exit 0   active 32 · pending 9 · failures 0
node scripts/audits/dep-graph.mjs                           exit 0   1210 modules · 6 cycles · 155 violations
node scripts/audits/codebase-inventory.mjs                  exit 0   modules 174 · files 1210
SCOPE_BASE=a33f49b9 node scripts/audits/verify-item-scope.mjs        ITEM-LEVEL SCOPE: MATCH
node scripts/fitness/check-baseline-tag-integrity.mjs                BASELINE-NAZRA-002 ok (28 entries)
```

Every figure reproduces the sealed BASELINE-NAZRA-002 snapshot **bit for bit**.
Nothing was repaired, suppressed, re-classified or beautified to help G0 pass.

## 3. Known failures — carried forward unchanged

| ID | Status | Explicitly NOT resolved |
|---|---|---|
| `PRE-PDF-001` | OPEN / Deferred | 2 collection (syntax) failures + 1 `contrastRatio` assertion. Needs its own scoped unit. |
| `PRE-TS-001` | RECURRING #5 / Platform Regeneration Drift | Symptom re-applied at preflight. Root cause chain (canonical source → generator → trigger → artifact) unresolved. |
| Lint | 39 errors / 865 warnings | All pre-existing, none inside the 25 approved files. |
| `RISK-007` | OPEN | Separate security track; 2FA containment recorded, 5 proofs outstanding. |

## 4. Decision

```text
Lineage              CONSISTENT
Evidence freshness   FRESH (regenerated at G0 time)
Hash integrity       VERIFIED (28/28 entries + composite)
Scope integrity      VERIFIED (file-level + item-level)
Stale evidence       NONE
Baseline corruption  NONE
Known failures       DOCUMENTED AND VISIBLE

G0                   PASS
Certification        NOT GRANTED
Phase 0              NOT AUTHORIZED BY THIS RECORD
```

G0 passes on the contracted rule `Evidence Integrity ≠ Codebase Health`.
Phase 0 (`BOUNDARY_CATALOG.md`, ADR-0031, ADR-0044 → `BASELINE-UX4-001`) requires an
explicit, separate human authorization and is **not** started here.
