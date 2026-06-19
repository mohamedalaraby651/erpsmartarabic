# Architecture Decision Records

Every architectural decision is recorded here as a numbered ADR.

## Index

- [ADR-0000 — Architecture Frozen Before Frontend Modernization](./0000-architecture-frozen-before-frontend-rewrite.md)

## Format

```
# ADR-NNNN: <Title>

- Status: Proposed | Accepted | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Phase: UX-N

## Context
## Decision
## Consequences
## References
```

## Rules

1. ADRs are immutable once Accepted. Reversals are new ADRs that mark the old one Superseded.
2. Anything that changes structure, dependencies, or layer boundaries requires an ADR **before** code.
3. ADRs reference KPIs, principles, and prior ADRs explicitly.
