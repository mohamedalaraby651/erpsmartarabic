# OPA-CUST-UI-005 v2.0 — B0/B1 Record
Status: B0 IMPLEMENTED + VERIFIED · B1 IMPLEMENTED, live re-verification pending · NOT HUMAN ACCEPTED · NOT CERTIFIED — 2026-09-26

## B0 — Workspace State Contract (`src/lib/customers/workspaceState.ts`)
- Pure `parse → normalize → validate → serialize`; whitelists, length caps, bidi/control stripping; invalid fields dropped individually.
- Legacy saved-view and URL shapes adapted without migration. URL codecs for sort / column filters / view id. Presets = existing quick-filter semantics.
- Tests: `src/__tests__/unit/lib/customerWorkspaceState.test.ts` — 10/10.

## B1 — Saved Views + URL
- Saved views store the full query state (search, filters, column filters, sort) in the existing `user_saved_views` JSON column. Repository gained `update` (rename / replace payload) only.
- View identity: active view id + stored snapshot vs live state → «<name> • معدّل» with save changes / save as new / undo.
- URL now carries `sort`, `cf`, `view` alongside legacy keys; unrelated params are preserved.
- Defect found live and fixed: concurrent router param updates overwrote each other (bad links kept junk, preset link kept the old status). Replaced by a single batched writer (`patchUrl`).
- Live evidence before the fix: invalid link → 15 rows, no page error; deep link `status=debtors&sort=current_balance.desc` → 9 rows; VIP preset → 7 rows; typing after preset → «VIP، معدّل».
- Live re-check after the fix: BLOCKED — backend pooler unavailable (544) while minting a test session.

## Checks
- Full tests 1648 passed / 5 skipped; typecheck PASS; scoped lint 0 errors.
- Generated `previewAuthStorage.ts` TS7011 regenerated twice this session; one-line annotation re-applied each time (platform recurrence, tracked separately).

## Smart Freeze
No DB/RLS/migration/permission/financial change.
