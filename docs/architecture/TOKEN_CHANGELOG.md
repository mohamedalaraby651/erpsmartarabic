# Design Token Changelog

**Status:** Active (UX-1, Wave 0)
**Token version source:** `src/ui/tokens/index.ts` exports `TOKEN_VERSION`.

## Versioning Scheme

`vMAJOR.MINOR` (semver for tokens)

| Bump | Trigger |
|---|---|
| MAJOR (`v1 → v2`) | Breaking: removed token, changed semantic meaning, renamed token, changed HSL value beyond perceptual threshold |
| MINOR (`v1 → v1.1`) | Additive: new token, new variant, new theme |

A patch-level bump (typos, comments) does not change `TOKEN_VERSION`.

## Rules

1. After Foundation Freeze (end of UX-1), tokens may change only via a new ADR superseding the freeze ADR (with INDEX update).
2. Every change appends an entry to this file in the same PR.
3. Consumers (`src/ui/**`, `src/workspaces/**`) MUST consume tokens only via CSS variables or the `tokens` export. No hardcoded HSL/hex/font-family.
4. Token removals require one full UX phase of `@deprecated` JSDoc on the export.

## Log

### v1 — UX-1A (initial)

- **Date:** 2026-06-19
- **Added:** semantic color palette (HSL), typography scale, spacing scale, radius scale, elevation scale, motion (durations + easings).
- **Removed:** —
- **Source of truth:** CSS variables in `src/index.css`, mirrored programmatically in `src/ui/tokens/*`.
- **Public API:** `src/ui/tokens/index.ts` (also re-exported from `src/ui/index.ts`). Deep imports forbidden — enforced by `scripts/fitness/check-token-export.mjs`.
- **Pilot consumer:** canonical `Button` at `src/ui/primitives/Button.tsx`.
- **Notes:** Initial Foundation Freeze candidate. Will be locked to `v1` at end of UX-1.

<!--
New versions append below. Template:

### vX.Y — UX-NX
- Date:
- Added:
- Changed:
- Removed:
- ADR: ADR-XXXX
- Migration notes:
-->
