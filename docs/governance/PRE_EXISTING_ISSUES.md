# Pre-Existing Issues Register

Issues observed but **not fixed** in the wave that discovered them. Recording an issue is not scheduling it; scheduling happens through a wave's preflight or the Risk backlog.

## PRE-TS-001

```text
ID:             PRE-TS-001
Discovered in:  Wave 0 (observation only)
Classified in:  Wave 1 Preflight (2026-08-26)
File:           src/integrations/supabase/previewAuthStorage.ts (lines 81, 85)
Detail:         setItem / removeItem arrow functions lack explicit return-type
                annotations; tsgo raises TS7011 under tsconfig.app.json
                (noImplicitAny: true).
Severity:       Known / Pre-existing — typecheck-only
Status:         OPEN — DEFERRED (no safe bounded remedy exists today)
Change class:   Non-trivial BY POLICY (platform-protected auto-generated file),
                not by complexity.
```

### Preflight findings (evidence-backed)

1. **Source of truth:** `tsconfig.app.json` (`noImplicitAny: true`, `include: ["src"]`) is the only config raising the error. It is the app-wide typecheck config; app-owned code depends on its strictness.
2. **The file cannot be edited.** It is auto-generated and platform-protected.
3. **The narrow-exclusion remedy was tested and does not work.** Adding
   `src/integrations/supabase/{client,types,previewAuthStorage}.ts` to `exclude`
   was probed with a throwaway config: TypeScript's `exclude` only removes *root*
   files, and `previewAuthStorage.ts` is transitively imported by ~169 modules
   through `client.ts`, so it is still typechecked. The two errors persisted
   verbatim. Exclusion is therefore rejected as ineffective, not merely risky.
4. **Broad relaxation is prohibited.** Turning off `noImplicitAny` (or excluding
   `src/integrations/**`) would hide application-owned errors — a coverage loss
   the plan forbids.
5. **Runtime and build are unaffected.** `vite build` exits 0 at this commit; the
   failure is confined to the strict typecheck signal.

### Decision

No remedy is applied. The issue stays Open/Deferred and is registered as a
time-boxed exception (`EXC-001`). Re-evaluate when the platform regenerates
`previewAuthStorage.ts`, or when a project-owned typecheck wrapper that can
suppress diagnostics per file (without weakening app-owned coverage) is
introduced as its own change unit.

## Rules

- An entry here is never repaired opportunistically inside an unrelated batch (Contract §31).
- Each entry is classified at the start of a wave, and either fixed as its own isolated change unit or explicitly deferred again with a reason.
- Fixing an entry produces its own before/after and evidence record in `PROGRESS_LOG.md`.
