# Production Readiness & Security Audit — Plan

## Current state (from quick audit)

- `src/integrations/supabase/client.ts`: uses `import.meta.env.VITE_SUPABASE_*` with **no fallbacks** ✅ — but no runtime guard if env vars are missing.
- `src/App.tsx` QueryClient: already `retry: failureCount < 2` + exponential backoff (1s→8s cap) + skips 401/403/42501/PGRST301 ✅. Mutations `retry: false` ✅.
- `src/lib/repositories/_base.ts` `mapRepoError`: returns Arabic message, attaches original to `.cause`, but **does NOT log** the original error anywhere → silent failures in prod.
- `console.log` calls present in ~8 production files (syncManager, observability, pdf, performanceMonitor, etc.).
- Repositories use Supabase query builder (`.from().select()`, `.eq()`, `.ilike()`) — no raw SQL template strings expected, but need a verification pass.

---

## Step 1 — Client & Env Hardening

- Add a startup assertion in `src/integrations/supabase/client.ts` that throws a clear error if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` are empty/undefined, so prod builds fail fast instead of silently calling `undefined`.
- Confirm no `||`/`??` fallback literals exist anywhere in client bootstrap.

## Step 2 — Repository SQL-Injection Sweep

- Grep every file under `src/lib/repositories/` for:
  - Raw `.rpc(` calls passing unsanitized user input.
  - Template literals inside `.or(`, `.filter(`, `.ilike(`, `.textSearch(` (the only PostgREST surfaces that accept expression strings).
  - Any usage missing the existing `sanitizeSearch()` helper.
- Patch any offender to route through `sanitizeSearch` (already standardized in `src/lib/utils/sanitize.ts`).

## Step 3 — `mapRepoError` Isolated Logger

- Extend `src/lib/repositories/_base.ts`:
  - Introduce a single `repoLogger` token (namespaced `[repo]` prefix, dev-only `console.error`, prod → forwards to `logErrorSafely` from `src/lib/errorHandler.ts`).
  - `mapRepoError` invokes `repoLogger` with the original Postgres error (code, hint, details) **before** wrapping it — so stack traces stay server/console-side while the Arabic toast only sees the friendly message.
- No public API change → zero ripple to call sites.

## Step 4 — React Query Tuning Verification

- Re-confirm `App.tsx` retry/backoff config matches spec (already does; document as-is).
- Add an explicit comment block referencing the production SLO so future edits don't regress it.

## Step 5 — Dead-Code & Console Purge

- Sweep production paths (`src/lib`, `src/components`, `src/pages`, `src/hooks`) for stray `console.log`/`console.debug`.
- Replace operational logs with `logErrorSafely` / `emitTelemetry`.
- Preserve intentional dev-only logs guarded by `import.meta.env.DEV`.
- Leave `console.error`/`console.warn` in error boundaries untouched (they're correct).

## Step 6 — Final Verification

- `bunx tsc --noEmit` (smoke).
- `bunx vitest run` → confirm **1187/1187 green** baseline preserved.
- Report any drift; no business-logic changes are introduced by this audit.

---

## Files expected to change

- `src/integrations/supabase/client.ts` — **NOTE**: this file is marked auto-generated. If the env-guard cannot be added here, we'll add the assertion in `src/main.tsx` instead (pre-mount check).
- `src/lib/repositories/_base.ts` — add `repoLogger` + wire into `mapRepoError`.
- 0–N repositories under `src/lib/repositories/` — only if injection-vector grep finds an offender.
- 4–8 files under `src/lib`, `src/components`, `src/pages` — replace stray `console.log` calls.

## Out of scope

- No schema/RLS changes.
- No edge-function changes.
- No UI/visual changes.
- No new dependencies.

Act as a Principal DevSecOps Engineer and Senior Database Administrator. We are executing the "Production Readiness & Security Audit — Plan" to bulletproof SmartERP before live traffic. Our baseline is 1187/1187 green tests. 

&nbsp;

Please systematically implement the following 6 audit steps without altering business logic or breaking tests:

&nbsp;

1. Step 1 — Pre-mount Env Hardening (Safe Location):

- Do NOT edit the auto-generated `src/integrations/supabase/client.ts`. Instead, open `src/main.tsx`.

- Inject a strict runtime startup assertion at the absolute top of `src/main.tsx` (before rendering `<App />`). It must immediately throw a crystal-clear descriptive error if `import.meta.env.VITE_SUPABASE_URL` or `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` are empty/undefined, forcing production builds to fail-fast rather than calling undefined.

- Confirm no fallback literals (`||` or `??`) exist for these environment tokens anywhere in the bootstrap lifecycle.

&nbsp;

2. Step 2 — Repository SQL-Injection Sweep:

- Scan every repository file under `src/lib/repositories/`. 

- Inspect all PostgREST query expressions using template literals or raw strings inside `.or()`, `.filter()`, `.ilike()`, `.textSearch()`, or `.rpc()`.

- If any dynamic unsanitized user-input expressions are found, refactor them immediately to route through our standardized `sanitizeSearch` helper (from `src/lib/utils/sanitize.ts`).

&nbsp;

3. Step 3 — mapRepoError Isolated Logger Integration:

- Refactor `src/lib/repositories/_base.ts` to solve silent failures in production.

- Introduce an isolated `repoLogger` token. In development (`import.meta.env.DEV`), it outputs a clean namespaced `[repo]` console.error. In production, it securely forwards the telemetry payload to `logErrorSafely` from `src/lib/errorHandler.ts`.

- Update `mapRepoError`: Ensure it invokes `repoLogger` with the original Postgres exception metadata (code, hint, structural details) BEFORE returning the friendly Arabic message. This keeps internal stack traces hidden from the user toast but fully visible to telemetry. Maintain exact call signatures to prevent ripple effects.

&nbsp;

4. Step 4 — React Query SLO Documentation:

- Inspect `src/App.tsx`. Re-verify that the global `QueryClient` retries are strictly capped at < 2 with exponential backoff, skipping auth/permission error boundaries (401/403/42501). 

- Add a clear, structural code comment block referencing the Production Service Level Objective (SLO) directly above the config declaration to lock it against future regression.

&nbsp;

5. Step 5 — Production Dead-Code & Console Purge:

- Sweep operational paths (`src/lib`, `src/components`, `src/pages`, `src/hooks`). 

- Locate stray operational `console.log` and `console.debug` statements (especially in syncManager, observability, pdf, and performanceMonitor).

- Replace them with safe telemetry equivalents using `logErrorSafely` or `emitTelemetry`. Guard any remaining dev logs with an explicit `if (import.meta.env.DEV)` clause. Leave error-boundary `console.error` logs untouched.

&nbsp;

6. Step 6 — Compilation & Final Smoke Test:

- Ensure compilation stability with `bunx tsc --noEmit`.

- Run the full suite using `bunx vitest run` to ensure that our 1187 test baseline remains 100% green, sta

ble, and completely untouched!