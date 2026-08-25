# Pre-Existing Issues Register

Issues observed but **not fixed** in the wave that discovered them. Recording an issue is not scheduling it; scheduling happens through a wave's preflight or the Risk backlog.

## PRE-TS-001

```text
ID:             PRE-TS-001
Discovered in:  Wave 0 (observation only)
File:           src/integrations/supabase/previewAuthStorage.ts (lines 81, 85)
Detail:         setItem / removeItem arrow functions lack explicit return-type
                annotations; under the project's strict TS settings this raises
                TS7011 ("implicitly has an 'any' return type").
Severity:       Known / Pre-existing
Status:         Open
Scope:          Outside Wave 0
Classification: Deferred — the formal change class is assigned in Wave 1 Preflight,
                never inside Batch B.
Notes:          The file is marked auto-generated. Any fix must be confirmed as a
                pure annotation change with zero behavior impact, executed as an
                isolated change unit with its own evidence, before Batch B begins.
```

## Rules

- An entry here is never repaired opportunistically inside an unrelated batch (Contract §31).
- Each entry is classified at the start of a wave, and either fixed as its own isolated change unit or explicitly deferred again with a reason.
- Fixing an entry produces its own before/after and evidence record in `PROGRESS_LOG.md`.
