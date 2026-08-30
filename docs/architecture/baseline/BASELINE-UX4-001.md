# BASELINE-UX4-001

- **Status:** **SEALED** — 2026-08-30, by Human Governance decision **D-5** in `HRD-NAZRA-001`.
- **Composite:** `e8f506d113e785015fca864a823990bda09f5878e76eb8166305edc4e403f392` (30 entries) — `scripts/audits/output/baseline-ux4-001.json`
- **Sealing evidence chain:** `BASELINE-NAZRA-002` → `G0R-NAZRA-002` (PASS, evidence integrity) → Human Review (`HRD-NAZRA-001`) → SEAL
- **Meaning of the seal:** a fixed reference point for Phase 1 only. Every later change is presented as **Baseline + Delta + Evidence**. Sealed ≠ Architecture PASS ≠ Security PASS ≠ Enterprise Certified.
- **Authorizes:** `PH1A-NAZRA-001` (Tenant Isolation, closed scope, hash `9f3349569ab0af16d91c529c47eb629e34e682c9b04d0aa0aa9a42f8dfb96a5a`).
- **Type:** Boundary Model baseline (governance artifact, not a code baseline)
- **Parent:** `BASELINE-NAZRA-002` (composite `1b4fafd5d784c0b28daa3fb25653368adc11745b38e5523852b563d4e24cdf87`, 28 entries — re-verified OK)
- **Preceding gate:** `G0-NAZRA-001` — PASS (evidence integrity only)
- **Evidence revision:** `061c96460deedda26228550f30a574352ec909d1`
- **Certification:** **NOT CERTIFIED**

## 1. What this baseline represents

The **Boundary Model state** of Nazra at the end of Phase 0. It records which boundaries
exist, who owns them, what must hold, and what evidence would prove it. It records **no**
improvement in code quality, security posture, or production readiness, because Phase 0
changed no business code.

```text
G0 PASS  ≠  Architecture PASS  ≠  Security PASS  ≠  Production Ready
```

## 2. Deliverables produced

| Artifact | State |
|---|---|
| `docs/architecture/BOUNDARY_CATALOG.md` | 8/8 boundaries, 16/16 fields each |
| `docs/adr/0031-enterprise-boundary-contract.md` | Accepted |
| `docs/adr/0044-modular-monolith-and-service-extraction-conditions.md` | Accepted |
| `docs/architecture/PRE-TS-001-ROOT-CAUSE.md` | Root cause identified, ownership recorded, **OPEN** |
| `docs/governance/PHASE0_EXIT_GATE.md` | Exit-gate evidence record |

## 3. Boundary state at seal candidate

| Boundary | RAG | Violations | Certified |
|---|---|---:|---|
| BND-01 UI → Application | 🟡 | 11 page→repo · 98 UI→supabase | No |
| BND-02 Application → Domain | 🟢 finance / 🟡 rest | 0 (`domain→ui`) | No |
| BND-03 Domain → Repository | 🟢 invoice / 🔴 rest | 41 components→repositories · 5 →services | No |
| BND-04 Repository → DB | 🔴 | 98 direct client usages | No |
| BND-05 Tenant → Data | 🟡 | not enumerated | No |
| BND-06 User → Permission | 🟡 | not enumerated | No |
| BND-07 Offline → Server | 🟡 | not enumerated | No |
| BND-08 Event → Consumer | 🟡 | 0 immutability | No |

**0 / 8 boundaries certified.**

## 4. Evidence regenerated at Phase 0 close

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsgo -p tsconfig.app.json --noEmit` | **exit 2 — 2 × TS7011** in `previewAuthStorage.ts` (**PRE-TS-001 recurrence #6**, deliberately NOT repaired in Phase 0) |
| Fitness | `node scripts/fitness/run-all.mjs` | exit 0 — active 32 · pending 9 · failures 0 |
| Dependency graph | `node scripts/audits/dep-graph.mjs` | exit 0 — 1210 modules · 6 cycles · **155** violations · `pages→repositories` **11** |
| Baseline integrity | `check-baseline-tag-integrity` | `BASELINE-NAZRA-002` ok (28 entries) |
| Business-code diff | manual + scope review | **0 changes** — Phase 0 touched `docs/` only |

> Typecheck is **red**, and Phase 0 refuses to make it green by editing a platform-owned
> generated artifact for the sixth time. See `PRE-TS-001-ROOT-CAUSE.md`.

## 5. Open findings carried forward (none closed by Phase 0)

| ID | Status |
|---|---|
| `PRE-PDF-001` | OPEN — deferred; 3 failing test files |
| `PRE-TS-001` | OPEN — root cause identified (platform artifact ownership); recurrence #6 observed and left in place by design |
| `RISK-007` | OPEN — security backlog, 5 proofs outstanding |
| Lint | OPEN — 39 errors / 865 warnings, all pre-existing |

## 6. Position in the governance chain

```text
BASELINE-NAZRA-002 → G0 (PASS) → PHASE 0 → Evidence → G0 → Human Review → BASELINE-UX4-001 (seal)
                                                                              │
                                                                 ┌────────────┼────────────┐
                                                                 ▼            ▼            ▼
                                                               TRUST       PRODUCT     COMMERCIAL
```

Phase 1 does **not** start automatically after the seal. Tenant Authority · Permission ·
Ledger Posting · Payment · Stock Movement · Sync Semantics remain under **Smart Freeze**
until their owning domain is individually certified against its boundary exit criteria.

## 7. What this baseline does NOT claim

- ❌ Boundaries enforced
- ❌ Architecture certified
- ❌ Security certified
- ❌ Tests green
- ❌ Production ready
- ❌ Phase 1 authorized openly (only the closed Phase 1A contract `PH1A-NAZRA-001` is authorized)
