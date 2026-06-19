# Workspace Certification

**Status:** Active (UX-1, Wave 0)

## Purpose

Prevent quality drift across workspaces as the platform grows. A workspace is **Certified** only when it passes every check below. Uncertified workspaces are allowed in development, never in production releases past UX-3.

## Certification Checklist

| # | Check | Evidence |
|---|---|---|
| 1 | Exports a valid `WorkspaceDefinition` | `check-workspace-api.mjs` PASS |
| 2 | Engineering Scorecard ≥ 90 | `scorecard.mjs` output for this workspace |
| 3 | UX Regression Checklist PASS on every primary route | Signed checklist in PR |
| 4 | UI Performance Budget PASS on every primary route | React Profiler trace + bundle delta |
| 5 | All data access goes through `src/contracts/**` | `check-direct-db.mjs` PASS, `check-layering.mjs` PASS |
| 6 | Uses only `Canonical` (or `Candidate` w/ ADR) primitives | `check-canonical-components.mjs` PASS |
| 7 | No hardcoded color/font/spacing literals | `check-token-usage.mjs` PASS |
| 8 | 0 direct DB hits in `<workspace>/**/ui/**` | `check-direct-db.mjs` PASS |
| 9 | 0 new `import-layer-violations` entries vs baseline | `scripts/audits/output/import-layer-violations.json` |
| 10 | All `WorkspaceRoute`s declare required permissions | Code review + grep |
| 11 | All forms use `useFormDialog` + `FormDialogFooter` + `FormFieldError` | Code review |
| 12 | All lists use `useListState` pattern | Code review |

## Certification Record

When a workspace passes, append a row to `docs/architecture/CERTIFIED_WORKSPACES.md` (created at first certification):

```
| Workspace | Date | UX phase | Scorecard | ADRs |
|---|---|---|---|---|
| suppliers | 2026-MM-DD | UX-1E | 92 | ADR-0001..ADR-0009 |
```

## Re-certification

A Certified workspace loses certification automatically if:

- Any fitness function starts failing for files within the workspace.
- A new ADR supersedes a canonical primitive used by the workspace and the workspace has not migrated within one UX phase.
- The Scorecard drops below 90 on two consecutive runs.

Re-certification follows the same checklist.
