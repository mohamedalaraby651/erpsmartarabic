# CERT-REV-BND05 → F0 — Certification Review, then Frontend Platform Baseline

Adopted state (no change requested to it):

```text
G0R-NAZRA-002   ACCEPTED        PH1A    CANDIDATE COMPLETE
BASELINE-UX4-001 SEALED         BND-05  CERTIFICATION HOLD
PRE-TS-001      CONTAINED       PH1B    NOT AUTHORIZED
RISK-007 / RISK-008  OPEN       Smart Freeze  ACTIVE
Boundaries certified 0/8
```

Two units only, in order. Neither is a sprint, neither reopens PH1A scope, neither lifts
Smart Freeze, neither touches RISK-007/008.

---

## Unit 1 — CERT-REV-BND05 (evidence review, zero code mutation)

Deliverable: `docs/governance/CERT_REV_BND05.md` plus a machine-readable
`scripts/audits/output/cert-rev-bnd05.json`. No source, schema, or policy changes. If the
review finds a real gap, it is recorded as a finding and BND-05 stays on HOLD — the review
must not quietly fix anything.

### A. PH1A-OBS-001 — the 37 functions

Verified before writing this plan: the evidence artifact records 88 tenant-referencing
functions, 51 with an explicit tenant predicate, so 37 carry `has_tenant_check: false`.

For each of the 37, read the function source from the live catalog (`pg_get_functiondef`)
and record six fields:

| Field | Meaning |
|---|---|
| tenant-scoped by nature? | does it read/write tenant rows at all |
| tenant authority location | `get_current_tenant()`, `auth.uid()`, RLS of the tables it touches, or none |
| caller-controlled `tenant_id`? | does any argument feed a tenant column or predicate |
| cross-tenant reachable path? | can any argument value reach another tenant's rows |
| invocability | `SECURITY DEFINER` vs `INVOKER`, and EXECUTE grants to `anon`/`authenticated` |
| compensating control | what denies cross-tenant access absent an explicit predicate |

The decisive distinction is `SECURITY INVOKER` (RLS still applies — the restrictive
tenant policies from PH1A are the compensating control) versus `SECURITY DEFINER`
(RLS bypassed — needs its own predicate or an admin-only grant).

Classification, every row justified:

```text
37 ── ACCEPTED EXEMPTION      (INVOKER under RLS, or DEFINER with admin-only grant)
   ├─ FALSE POSITIVE          (does not touch tenant data; detector matched a token)
   └─ REMEDIATION REQUIRED    (DEFINER, tenant data, no predicate, invocable)
```

Any row in `REMEDIATION REQUIRED` → BND-05 stays HOLD and the row becomes a scoped
follow-up contract; it is not fixed inside this review.

### B. journals / journal_entries — execution-order proof

Prove mechanically, not by argument, that the business trigger denying cross-tenant INSERT
does not create a bypass:

1. Establish ordering from the catalog: `BEFORE INSERT` triggers run before the row is
   written; RLS `WITH CHECK` is evaluated at write time. Record the trigger list and
   timing for both tables.
2. Probe as `authenticated`, re-homed to the throw-away tenant, inside an aborted
   transaction — the same harness X-7 already uses:
   - INSERT with a foreign `tenant_id` → denied (record whether by trigger or policy).
   - INSERT crafted to satisfy the business trigger (open fiscal period, balanced entry)
     but carrying a foreign `tenant_id` → must be denied **by the restrictive RLS policy**.
     This is the test that matters: it shows the trigger is an earlier gate, not the only one.
   - SELECT / UPDATE / DELETE cross-tenant → zero rows (already evidenced; re-confirmed).
3. Confirm no `SECURITY DEFINER` posting function inserts into these tables on a path that
   skips the tenant predicate (cross-checked against the Unit 1A table).

Outcome: if step 2 shows RLS denies the trigger-satisfying case, this is recorded as
**documented enforcement behaviour**, not a finding.

### Exit of Unit 1

`CERT_REV_BND05.md` presented for human decision with an explicit recommendation and no
self-certification. Certification of BND-05 (1/8) remains a human decision.

---

## Unit 2 — F0 Frontend Platform Baseline (measure only, starts after BND-05 is decided)

Not a fix, not a refactor, not design system work. One question: what is actually left?

Measured already (read-only, before this plan):

| Signal | Now |
|---|---|
| Import-layer violations total | 155 |
| `pages → repositories` | 11 |
| `components → repositories` / `→ services` | 41 / 5 |
| `hooks → supabase-client` | 31 |
| `components → supabase-client` / `pages → supabase-client` | 38 / 29 |
| `domain → ui` | 0 |
| UI files importing the DB client directly | 68 |
| Remaining `@/components/ui-kit` call sites | 3 |
| `check-ui-api-uniformity` (warn) | 42 components |
| `check-design-system-inventory` (warn) | 635 findings |
| `check-no-inline-styles` / `check-no-any-in-ui` (warn) | 48 / 14 files |
| `check-component-loc-budget` (warn) | 2 over budget |

F0 adds what is not yet measured: query-service coverage gaps per read path, theme-token
usage vs hardcoded values, state-ownership map (server / application / local / offline),
RTL inconsistencies, accessibility gaps, a performance baseline (bundle, LCP, INP, CLS,
route load, query latency, render cost), and PWA/mobile gaps.

Then the classification that drives everything after it — every one of the 155 assigned a
bucket with a rationale:

```text
155 ── legitimate exception
    ├─ transitional
    ├─ false positive
    └─ actual violation   ← the only bucket F1/F2 may touch
```

Deliverables: `docs/governance/F0_FRONTEND_BASELINE.md` (`SNAPSHOT-F0-001`), the
classification table, and a draft `F1_SCOPE_001` item list. Performance budget numbers are
left blank in F0 — they are proposed in F5 from measured data, never invented now.
No scope hash is frozen and no remediation begins until the human approves the F1 scope.

Order after F0: F1 Architecture → F2 Repository/Query/Application → F3 UI Platform →
F4 State → F5 Quality/RTL/A11y/Performance → Frontend Platform Gate → next Enterprise
Boundary. Track A is Consolidation of the existing platform; a proposal to rewrite the UI
is an automatic STOP.

## Governance applied to both units

Declared scope → pre-verification → work → post-verification → evidence pack → human
review. No self-certification, no silent baseline edits (differences appear as documented
Deltas), and any drift outside the declared item list is a STOP. BND-05 certification, if
granted, certifies one boundary only — it does not close RISK-007, RISK-008, or the
Smart Freeze.

## Executed on approval

Unit 1 only. F0 begins after the BND-05 certification decision is recorded.
