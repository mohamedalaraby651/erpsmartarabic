# DS-001 — Why `tone`, not `color`

**Related:** ADR-0029 (UI API Uniformity)

## Decision

Component prop names use `tone` for semantic emphasis
(`primary | neutral | success | warning | danger | info`).

## Why not `color`?

- `color` collides with the HTML `color` attribute and with CSS `color`.
- `color` implies a raw value; `tone` implies a mapped role.
- `tone` reads naturally alongside `variant` (shape) and `size` (metrics).

## Why not `intent`?

- `intent` is verb-flavored ("what the user wants to do"). Tone is
  descriptive ("how the component reads"). They belong on different props.
- Some libraries conflate them; that is the trap this DS prevents.

## Applies to

Every interactive/expressive component in `src/ui/**` with a semantic
emphasis dimension.
