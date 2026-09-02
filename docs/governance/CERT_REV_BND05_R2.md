# CERT-REV-BND05-R2 — Certification Review (Round 2)

- Unit: `CERT-REV-BND05-R2`
- Boundary: BND-05 — Tenant → Data
- Authorization: explicit, R2 only. Not authorized in this unit: F0, PH1B, any other
  boundary, closing RISK-007 / RISK-008, fixing PRE-EXT-001, any further remediation.
- Mutation: **none**. This unit reads, probes and records. It fixes nothing.
- Evidence: `scripts/audits/output/cert-rev-bnd05-r2.json` (source `live`)
- Generator: `scripts/audits/cert-rev-bnd05-r2.mjs`
- Certification: **NOT CLAIMED** — the BND-05 decision belongs to human review.

## 1. Method

A real `authenticated` user of tenant `a0000000-…-000000000001` acting through
PostgREST with a genuine JWT, against a **fresh** throw-away foreign tenant
`eeeeeeee-…-00000000000a` (deliberately a different fixture namespace from the
REM-BND05-001 post-proof, so nothing is inherited from the previous run). Plus a
live `pg_proc` re-read for the definer surface.

## 2. R-1 … R-7 — live negative proof

| ID | Call | Status | Body | Verdict |
|----|------|--------|------|---------|
| R-1 | `void_invoice(foreign invoice)` | 403 | `42501 cross-tenant access denied` | **PASS** |
| R-2 | `find_duplicate_customers()` | 404 | `42883` — no foreign PII | **PASS** (containment) |
| R-2b | `find_duplicate_customers(foreign tenant)` | 403 | `42501 cross-tenant access denied` | **PASS** |
| R-3 | `get_user_tenant_id(foreign user)` | 200 | `null` | **PASS** |
| R-4 | `get_user_tenants(foreign user)` | 200 | `[]` | **PASS** |
| R-5 | `is_period_closed(foreign tenant)` | 403 | `42501 cross-tenant access denied` | **PASS** |
| R-6 | `is_admin_equivalent_custom_role(_, foreign tenant)` | 403 | `42501 cross-tenant access denied` | **PASS** |
| R-7 | `check_financial_limit(4-arg, foreign tenant)` | 403 | `42501 cross-tenant access denied` | **PASS** |

Probe failures: **0**.

## 3. R-1 `void_invoice` — the decisive regression proof

Both properties were required and both were observed:

```
authenticated / tenant A
      ↓ rpc(void_invoice, foreign invoice of tenant B)
403 · 42501 "cross-tenant access denied"          ← denial
status_before = "pending" ; status_after = "pending"
mutation_occurred = false                          ← no mutation
```

Before remediation the same probe returned `200 {"success": true}` and the foreign
invoice was actually `cancelled` (`cert-rev-bnd05-definer-proof.json`, P-2). The
delta is therefore proven, not asserted.

## 4. Boundary-level cross-tenant probes (beyond the 7 functions)

| ID | Call | Status | Verdict |
|----|------|--------|---------|
| X-READ-1 | `GET invoices?tenant_id=eq.<foreign>` | 200 `[]` | DENIED (0 rows) |
| X-READ-2 | `GET customers?tenant_id=eq.<foreign>` | 200 `[]` | DENIED (0 rows) |
| X-WRITE-1 | `POST customers` with foreign `tenant_id` | 403 | DENIED BY RLS |

Journals remain covered by the live evidence of
`cert-rev-bnd05-journal-proof.json` (Test A denied by the business trigger,
Test B — trigger-satisfying payload with a foreign `tenant_id` — denied by RLS
`42501`, `journal_entries` denied by RLS, foreign SELECT returns `[]`). That
artifact is unchanged and is carried in the lineage below by its sha256.

## 5. SECURITY DEFINER re-audit

Live `pg_proc` re-read of all eight declared entries (7 remediated + the
untouched 3-arg control):

- definition md5 matches the declared `postMd5` for **8/8** — no drift, no silent
  re-definition after the migration;
- the untouched 3-arg `check_financial_limit` still hashes to its pre-value
  `1f04abd9…` — no scope expansion;
- security mode `DEFINER` for all (by design: they are tenant-authority or
  posting-authority functions);
- EXECUTE grants: `authenticated, service_role` only — `anon` executable count = **0**;
- `find_duplicate_customers` carries `search_path = public, extensions`; the other
  seven carry `search_path = public`.

## 6. PRE-EXT-001 — explicitly separated

`pg_trgm` is not installed, so `similarity()` is unresolvable and
`find_duplicate_customers` errors before returning a row.

> **Security containment achieved / functional capability not restored.**

R-2 passes as an *isolation* property (no foreign PII disclosed) and R-2b passes as
an explicit tenant rejection. The functional defect is recorded as **PRE-EXT-001 —
OPEN**, outside BND-05 scope, and is not fixed in this unit.

## 7. Non-regression

| ID | Call | Status | Verdict |
|----|------|--------|---------|
| N-1 | `get_user_tenant_id(self)` | 200 → own tenant | PASS |
| N-2 | `check_financial_limit(3-arg, self)` | 200 `true` | PASS |
| N-3 | `get_dashboard_overview()` | 200 | PASS |
| N-4 | `GET` own-tenant invoices | 200, rows returned | PASS |

Offline: `typecheck-app` total 0 / platform 0 / project 0 · fitness failures 0 ·
Vitest suite green (see §9).

## 8. Evidence lineage

```
PH1A Evidence
   ↓  tenant-isolation-report.json      6b5966f4…
CERT-REV-BND05
   ↓  cert-rev-bnd05.json               4476d083…
   ↓  cert-rev-bnd05-journal-proof.json 5e63faf4…
   ↓  cert-rev-bnd05-definer-proof.json f5376fd1…   (pre-remediation, void_invoice CONFIRMED breach)
REM-BND05-001
   ↓  rem-bnd05-001-scope.json          bfed3f2d…   scope hash f7ab4776…
   ↓  rem-bnd05-001-post-proof.json     130b4366…
Migration
   ↓  0005_rem_bnd05_001_definer_surface.sql  2ed6cce6…
CERT-REV-BND05-R2
      cert-rev-bnd05-r2.json            6b6726c3…
```

Documented deltas versus the earlier baseline:

1. **`cert-rev-bnd05.json` was regenerated after the migration.** It is therefore a
   post-remediation rendering of the same review, not a silent continuation. R2 does
   not rely on it for any pass/fail decision; the pre-remediation breach evidence
   used for the before/after comparison is `cert-rev-bnd05-definer-proof.json`,
   which was **not** regenerated.
2. **Observation set re-derived live = 33 entries** (heuristic re-run at R2 time)
   against PH1A's 37 rows / 35 unique names. The difference is accounted for by the
   remediation itself: seven functions now contain an explicit
   `get_current_tenant()` predicate and no longer match the "no predicate"
   heuristic, and the temporary `ph1a_cross_tenant_probe` was dropped. This is a
   *documented delta*, not a correction of the PH1A record.
3. `void_invoice` behaviour changed from `200 / foreign invoice cancelled` to
   `403 / unchanged` — the intended delta.

## 9. Fixture hygiene (disclosed, not smoothed over)

The sandbox database role holds only `SELECT, INSERT` on the fixture tables, so the
script's own cleanup was denied per statement and each denial is recorded verbatim
in the artifact. Cleanup was completed afterwards with the privileged connection.
Deleting the tenant row required temporarily disabling that table's user triggers,
because `log_activity()` inserts an `activity_logs` row referencing the tenant being
deleted (FK `23503`). Post-cleanup counts verified **0** for tenants, invoices,
customers, fiscal periods, memberships, activity logs and audit trail.

## 10. Result

```
R-1 … R-7            PASS (7/7)
journals             PASS (carried live evidence)
cross-tenant writes  DENIED
cross-tenant reads   DENIED
anon-executable definer paths   0
md5 drift            0
scope expansion      none
non-regression       4/4
probe failures       0
```

Artifact verdict: `R2 EVIDENCE PASS — certification decision belongs to human review`.

Standing status, unchanged by this unit:

```
PH1A          CANDIDATE COMPLETE
REM-BND05-001 EXECUTED / EVIDENCE PASS
BND-05        HOLD → awaiting human certification decision on this record
PRE-TS-001    CONTAINED
PRE-EXT-001   OPEN
RISK-007      OPEN
RISK-008      OPEN
Smart Freeze  ACTIVE
F0            NOT YET AUTHORIZED
PH1B          NOT AUTHORIZED
Boundaries certified 0/8
```

No certification is claimed here, and no remediation was performed in R2. Had any
probe failed, the required path would have been Finding → new scoped remediation →
evidence → R3, not an in-review fix.
