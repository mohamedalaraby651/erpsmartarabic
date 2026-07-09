# DS-003 — Spacing scale rationale

**Related:** ADR-0028

## Decision

Use Tailwind's default 4-pt spacing scale (`0.5 = 2px`, `1 = 4px`,
`2 = 8px`, `3 = 12px`, `4 = 16px`, `6 = 24px`, `8 = 32px`, `12 = 48px`,
`16 = 64px`). No custom spacing tokens.

## Why 4-pt?

- Matches Material, iOS HIG, and most existing design systems — reduces
  cognitive load for cross-tool work.
- Divides cleanly by 2 (grid subdivisions) and by 4 (baseline grid).
- Tailwind ships it natively — no config sprawl.

## Why not 8-pt?

- 8-pt over-quantizes small components (icons, badges, dense tables in
  RTL contexts).
- 4-pt is a strict superset — teams that prefer 8-pt can restrict
  themselves without a policy change.

## Applies to

All `padding`, `margin`, `gap`, `space-*` utilities inside `src/**`.
Hardcoded pixel values (`p-[13px]`, `mt-[7px]`) are prohibited.
