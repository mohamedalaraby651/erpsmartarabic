# DS-002 — Why `variant`, not `intent`

**Related:** ADR-0029, DS-001

## Decision

Component prop names use `variant` for shape/structure
(`solid | outline | ghost | link | soft`). Semantic emphasis lives on
`tone` (see DS-001).

## Why not `intent`?

- `intent` describes user goals, not visual form.
- Mixing "what it does" with "what it looks like" makes prop combinatorics
  explode (`intent=destructive-outline`).
- Splitting into `tone="danger"` + `variant="outline"` yields
  orthogonal, testable combinations.

## Why not `kind`?

- `kind` is too broad and used in many domain enums in this codebase
  (`document.kind`, `entry.kind`). Reserving it for domain prevents
  collision.

## Applies to

All primitives and composites that render more than one visual form.
