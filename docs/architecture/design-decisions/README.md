# Design Decision Log

Small, repeatable **design system** decisions that don't warrant a full ADR
but must be persisted to prevent re-litigation.

## When to use `DS-XXX` vs `ADR-XXXX`

| Use ADR | Use DS |
|---------|--------|
| Architecture, layering, ports, contracts | Prop naming, token scales, visual language |
| Cross-cutting invariants | Component-local conventions |
| Governance (freeze/sunset schedules) | "Why did we pick `tone` over `color`?" |
| Requires reviewer sign-off | Documented and moved on |

DS entries are lightweight. One page each. No status field.

## Index

- [DS-001 — Why `tone`, not `color`](./DS-001-tone-vs-color.md)
- [DS-002 — Why `variant`, not `intent`](./DS-002-variant-vs-intent.md)
- [DS-003 — Spacing scale rationale](./DS-003-spacing-scale-rationale.md)

Adding a new DS: pick the next number, keep it under one screen, link to
the ADR that governs the surrounding rule (if any).
