# RISK-006 — Composite integration gaps (UX-1E)

- **Status:** Open
- **Phase opened:** UX-1E
- **Owner:** UI Architecture
- **Linked ADRs:** ADR-0004, ADR-0005

## Context

UX-1E pressure-tested the canonical composites against a mock domain layer.
This risk tracks the structured gap classification produced by the spike.

## Findings

Each finding is tracked under a structured sub-ID. The single source of
truth for accepted findings is
`docs/architecture/ux1e-evidence/known-findings.json`. The fitness check
`check-regression-lock` fails CI if any finding referenced in the report
is not declared in that file, or if any finding is escalated to
`blocker`.

| Sub-ID | Severity | Composite | Summary | Deferred to |
|---|---|---|---|---|
| RISK-006-01 | minor | DataGrid | No row virtualization at 5000 rows | UX-1F |
| RISK-006-02 | minor | Form | FormDirty fires on every keystroke | UX-2 |

## Mitigation

- `RISK-006-01` — Add virtualizer in UX-1F (already deferred). Until then,
  rely on paginated reads in UX-2 query layer.
- `RISK-006-02` — UX-2 may introduce a `dirty` boundary at submit/blur to
  reduce event volume; keep envelope unchanged.

## Closure criteria

- Risk is closed by the ADR that supersedes ADR-0005 and reports the
  remediation outcome per sub-ID.
- Any new finding discovered in UX-2 wiring MUST first be added to
  `known-findings.json` (or escalated to a separate RISK), otherwise the
  regression-lock fitness fails.
