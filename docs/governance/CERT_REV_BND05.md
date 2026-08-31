# CERT-REV-BND05 — Certification Review of BND-05 (Tenant → Data)

- Review ID: `CERT-REV-BND05`
- Boundary: BND-05 — Tenant → Data
- Reviewed observation: `PH1A-OBS-001` (functions referencing tenant without an explicit predicate)
- Mutation: **none to application code, schema, policies or functions**. Two throw-away
  tenants were created and deleted to take live measurements; verified removed.
- Machine record: `scripts/audits/output/cert-rev-bnd05.json`
- Proof artifacts: `cert-rev-bnd05-journal-proof.json`, `cert-rev-bnd05-definer-proof.json`
- Outcome: **REMEDIATION REQUIRED — BND-05 must remain CERTIFICATION HOLD**
- Certification: **NOT CLAIMED** (human decision)

## 0. Count reconciliation

The PH1A artifact reported 88 tenant-referencing functions, 51 with an explicit
predicate, i.e. 37 observations. Those 37 rows resolve to **35 distinct names**;
in the live catalog they expand to **36 entries** (`check_financial_limit` has
two overloads) plus one stale name, `ph1a_cross_tenant_probe`, which was dropped
by migration `0004` and no longer exists. The review therefore covers 36 live
entries + 1 stale row = the full observation set, with nothing dropped silently.

## 1. Classification of every observed function

Facts (security mode, EXECUTE reachability, trigger attachment, tables touched,
definition hash) are read from the live catalog by `scripts/audits/cert-rev-bnd05.mjs`;
the classification and rationale of each row are in the JSON record.

| Function | Mode | EXECUTE | Kind | Caller-controlled tenant | Tenant authority | Classification |
|---|---|---|---|---|---|---|
| `_resolve_open_period(_tenant_id uuid, _date date)` | DEFINER | server only | callable | yes | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `apply_dn_stock_on_post()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `apply_gr_stock_on_post()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `auto_assign_default_tenant()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `check_financial_limit(_user_id uuid, _limit_type text, _value numeric)` | DEFINER | authenticated ✅ | callable | no | get_current_tenant() | **FALSE POSITIVE** |
| `check_financial_limit(_user_id uuid, _tenant uuid, _limit_type text, _amount numeric)` | DEFINER | authenticated ✅ | callable | yes | inherited from the row / caller argument | **REMEDIATION REQUIRED** (low) |
| `compute_three_way_matching()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `create_journal_for_credit_note(_credit_note_id uuid)` | DEFINER | server only | callable | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `create_journal_for_delivery_note(_delivery_id uuid)` | DEFINER | server only | callable | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `create_journal_for_expense(_expense_id uuid)` | DEFINER | server only | callable | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `create_journal_for_goods_receipt(_receipt_id uuid)` | DEFINER | server only | callable | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `create_journal_for_invoice(_invoice_id uuid)` | DEFINER | server only | callable | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `create_journal_for_payment(_payment_id uuid)` | DEFINER | server only | callable | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `create_journal_for_purchase_invoice(_invoice_id uuid)` | DEFINER | server only | callable | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `enforce_fiscal_period_open()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `find_duplicate_customers(p_tenant_id uuid)` | DEFINER | authenticated ✅ | callable | yes | inherited from the row / caller argument | **REMEDIATION REQUIRED** (medium) |
| `fn_log_pdf_profile_change()` | DEFINER | server only | trigger | no | auth.uid() | **ACCEPTED EXEMPTION** |
| `gen_quote_number()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `get_dashboard_overview()` | DEFINER | authenticated ✅ | callable | no | auth.uid() | **FALSE POSITIVE** |
| `get_user_tenant_id(_user_id uuid)` | DEFINER | authenticated ✅ | callable | no | inherited from the row / caller argument | **REMEDIATION REQUIRED** (low) |
| `get_user_tenants(_user_id uuid)` | DEFINER | authenticated ✅ | callable | no | inherited from the row / caller argument | **REMEDIATION REQUIRED** (low) |
| `is_admin_equivalent_custom_role(_role_id uuid, _tenant_id uuid)` | DEFINER | authenticated ✅ | callable | yes | inherited from the row / caller argument | **REMEDIATION REQUIRED** (low) |
| `is_period_closed(_tenant_id uuid, _date date)` | DEFINER | authenticated ✅ | callable | yes | inherited from the row / caller argument | **REMEDIATION REQUIRED** (low) |
| `log_activity()` | DEFINER | server only | trigger | no | auth.uid() | **ACCEPTED EXEMPTION** |
| `log_posting_failure(p_tenant uuid, p_doc_type text, p_doc_id uuid, p_event text, p_reason text)` | DEFINER | server only | callable | yes | auth.uid() | **ACCEPTED EXEMPTION** |
| `record_dispatcher_event_execution(_correlation_id text, _event_id uuid, _event_type text, _aggregate_type text, _aggregate_id uuid, _tenant_id uuid, _status text, _error text, _latency_ms integer, _attempts integer)` | DEFINER | server only | callable | yes | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `resolve_posting_account(_tenant_id uuid, _posting_key text)` | DEFINER | server only | callable | yes | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `reverse_journal_for_credit_note(_credit_note_id uuid)` | DEFINER | server only | callable | no | auth.uid() | **ACCEPTED EXEMPTION** |
| `reverse_stock_for_credit_note(_credit_note_id uuid)` | DEFINER | server only | callable | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `set_dn_item_tenant()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `set_gr_item_tenant()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `set_pinv_item_tenant()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `set_supplier_notes_tenant()` | DEFINER | server only | trigger | no | inherited from the row / caller argument | **ACCEPTED EXEMPTION** |
| `switch_user_tenant(_user_id uuid, _tenant_id uuid)` | DEFINER | authenticated ✅ | callable | yes | auth.uid() | **FALSE POSITIVE** |
| `void_invoice(_invoice_id uuid, _reason text)` | DEFINER | authenticated ✅ | callable | no | auth.uid() | **REMEDIATION REQUIRED** (critical) |
| `ph1a_cross_tenant_probe()` | N/A — not present in the catalog | — | callable | no | — | **FALSE POSITIVE** |

Summary: **25 ACCEPTED EXEMPTION · 4 FALSE POSITIVE · 7 REMEDIATION REQUIRED**.

The 25 accepted exemptions are all unreachable from a client session: EXECUTE is
held only by `postgres` / `service_role`, and the trigger functions among them
operate on rows the statement's own RESTRICTIVE tenant policy already admitted.
The compensating control is the grant surface plus table RLS, and it is recorded
per row rather than assumed.

## 2. Remediation-required findings

| # | Function | Severity | Why it is a finding | Evidence |
|---|---|---|---|---|
| R-1 | `void_invoice(uuid, text)` | **critical** | DEFINER + granted to `authenticated`; the invoice is fetched by id alone and the tenant is then read *from the fetched row*, so RLS never applies. A foreign invoice can be cancelled (and a reversing journal written into a foreign ledger). | **Confirmed live** — P-2 |
| R-2 | `find_duplicate_customers(uuid)` | medium | DEFINER + granted to `authenticated`; `p_tenant_id` defaults to NULL and the filter is `(p_tenant_id IS NULL OR …)`, so an argument-less call spans all tenants and returns customer names and phones. Currently blocked by an unrelated defect (`extensions.similarity` unresolved), so the disclosure is **latent, not live**. | P-1 |
| R-3 | `get_user_tenant_id(uuid)` | low | DEFINER read of `user_tenants` for any supplied user id, granted to `authenticated`: discloses another user's home tenant. | catalog + grants |
| R-4 | `get_user_tenants(uuid)` | low | Same shape; discloses another user's tenant memberships. | catalog + grants |
| R-5 | `is_period_closed(uuid, date)` | low | Boolean oracle over a foreign tenant's fiscal periods. | catalog + grants |
| R-6 | `is_admin_equivalent_custom_role(uuid, uuid)` | low | Boolean oracle over a foreign tenant's role configuration. | catalog + grants |
| R-7 | `check_financial_limit(uuid, uuid, text, numeric)` | low | Legacy 4-arg overload with a caller-supplied tenant, never compared to `get_current_tenant()`; boolean oracle over foreign role limits. The 3-arg form is correct. | catalog + grants |

Remediation is **not performed by this review** — it is out of the frozen PH1A
scope and requires its own authorization.

### The structural lesson

PH1A proved that RLS is complete and correct on 86 tables. R-1 shows the
boundary can still be crossed *around* RLS: a `SECURITY DEFINER` function that
takes its tenant from data instead of from `get_current_tenant()` is a hole in
the same boundary. Table-level completeness is necessary but not sufficient;
the definer surface is part of BND-05 and must be certified with it.

## 3. Journal / journal_entries proof (the decisive test)

The PH1A artifact only showed that the cross-tenant INSERT was rejected by a
business trigger firing before RLS — which does not prove RLS itself denies it.
That gap is now closed. Because the privileged connection here holds `BYPASSRLS`
and cannot `SET ROLE authenticated`, the proof was taken where a real client
sits: PostgREST, with a real authenticated user JWT.

| Test | Payload | Result | Verdict |
|---|---|---|---|
| A | foreign `tenant_id`, no fiscal period | HTTP 400 · `23514` "الفترة المالية مطلوبة" | denied by the business trigger (as previously recorded) |
| **B** | foreign `tenant_id` **+ open fiscal period of the foreign tenant, date in range** — i.e. the trigger is fully satisfied | **HTTP 403 · `42501` new row violates row-level security policy for table "journals"** | **denied by RLS — the decisive result** |
| C | `journal_entries` child row under a foreign-tenant journal | HTTP 403 · `42501` … for table `journal_entries` | denied by RLS |
| D | `SELECT` of foreign-tenant journals | HTTP 200 · `[]` | zero rows visible |

Conclusion: the trigger fires first, but RLS independently denies the write once
the trigger is satisfied. The recorded limit in ADR-0045 ("denial reason is the
trigger, not the policy") is now **superseded by direct evidence**: both controls
deny, in that order. `source: live`.

## 4. SECURITY DEFINER cross-check

All 36 live entries are `SECURITY DEFINER` with `search_path = public`. Definer
status alone is not a finding — the tenant authority functions (`current_tenant`,
`get_current_tenant`, `get_user_tenant_id`, `is_tenant_member`) must be definer to
read `user_tenants` above RLS. What decides the question is the triple:

```text
SECURITY DEFINER  ×  EXECUTE granted to authenticated  ×  tenant taken from the caller/row
```

Only 10 of the 36 are granted to `authenticated`. Of those, 3 derive the tenant
server-side (`check_financial_limit/3`, `get_dashboard_overview`, `switch_user_tenant`)
and are false positives; the other 7 are R-1 … R-7. `anon` holds EXECUTE on none
of the 36.

## 5. Status after this review

```text
G0R-NAZRA-002        ACCEPTED
BASELINE-UX4-001     SEALED
PH1A                 CANDIDATE COMPLETE
BND-05               CERTIFICATION HOLD  (7 remediation-required findings)
PH1A-OBS-001         CLOSED as an observation, reopened as findings R-1 … R-7
PRE-TS-001           CONTAINED (recurrence #9 handled by preflight)
RISK-007             OPEN
RISK-008             OPEN
Smart Freeze         ACTIVE
Boundaries Certified 0/8
F0                   BLOCKED BY SEQUENCE
```

X-1 … X-5, X-7 and X-8 remain valid and unaffected. X-6 changes from
"enumerated" to "reviewed, 7 findings".

## 6. Human decision required

BND-05 cannot be certified while R-1 is live. The review recommends a scoped,
separately authorized remediation unit (`REM-BND05-001`) covering R-1 … R-7,
followed by re-proof, and only then a certification decision. No self-certification
is claimed, no remediation was applied, and F0 remains blocked by sequence.

**Decision:** ______________________  **Date:** ____________
