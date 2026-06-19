# RISK-001 — Shadow Repository Regression

- **Status:** Open (tracked, mitigated by UX-2 audit)
- **Probability:** Medium
- **Impact:** Medium
- **Phase logged:** UX-0
- **Source:** Phase A2.5 POC discovered `SupplierRatingTab` calling `supabase.*` directly, bypassing the supplier repository.

## Description

After a clean repository layer is in place, individual components may still introduce ad-hoc `supabase.from(...)` or `supabase.rpc(...)` calls — a "shadow repository". These violate Principle 4 silently and accumulate undetected until a refactor (e.g., contract change, RLS rework) breaks production.

## Mitigation

1. **UX-0:** Capture the *full* current count (161) and classify by type (read/write/rpc/realtime/storage/auth) so any new bypass is detectable as a delta.
2. **UX-1:** Add ESLint rule (warn) on `src/components/**` and `src/pages/**` importing `@/integrations/supabase/client`.
3. **UX-2:** Promote the ESLint rule to `error`. Add a CI check that fails if `data-access-report.json` count grows.
4. **Continuous:** `scripts/audits/check-data-access.sh` remains the source of truth and runs on every PR after UX-2.

## Trigger Conditions

- `data-access-report.json` `total` increases between two consecutive phase reports → halt + investigate.
- A new file appears in `data-access-report.json` that is **not** in `src/lib/**`, `src/integrations/**`, or an approved exception → mandatory ADR or removal.

## Owner

Architecture review (per phase).
