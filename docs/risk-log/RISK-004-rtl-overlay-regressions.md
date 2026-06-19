# RISK-004 — RTL Regressions in Overlays and Compound Primitives

- **Opened:** 2026-06-19 (UX-1C)
- **Status:** Active — monitored via fitness function + per-overlay RTL tests.
- **Owners:** ERP UI Platform
- **Severity:** Low–Medium

## Summary

Strict RTL enforcement (`check-rtl-logical-properties.mjs`) bans physical
direction CSS inside `src/ui/primitives/**`. Overlay primitives (`Dialog`,
`Sheet`, `Tooltip`, `Toast`) and future compound components are most likely
to introduce regressions because positioning often reaches for `left`/`right`
or `translate(-50%, …)` patterns.

## Why it's a risk

- A subtle `right-0` left in an overlay variant flips the wrong side under
  Arabic RTL — silent visual breakage.
- Compound layouts (UX-1D) may need negative margins or arrow offsets that
  current logical-property utilities express less ergonomically.

## Mitigation (UX-1C)

- Fitness function fails CI on physical-direction utilities and CSS
  properties inside primitives.
- Each overlay primitive ships a dedicated RTL test asserting layout under
  `dir="rtl"`.
- `Sheet` uses `side="start" | "end"` instead of `left | right`.

## Escalation triggers

- UX-1D introduces a compound that cannot be expressed via logical
  properties → open an ADR amendment with an exception list (not a blanket
  relaxation).
- Two RTL regressions land within a single phase → upgrade severity to High
  and add visual regression tests.

## Tracking

- Reviewed at every UX phase gate. Closes only when the next two phases
  pass with zero RTL findings.
