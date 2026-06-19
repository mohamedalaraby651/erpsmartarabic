# UX Regression Checklist

**Status:** Active (UX-1, Wave 0)
**Use:** Run on every primary route of a workspace before certification, and on any canonical primitive PR.

## Scope

Each section must be signed (✅ / ❌ + note) in the PR description.

## 1. Keyboard

- [ ] Tab order matches visual order.
- [ ] All interactive elements reachable via keyboard.
- [ ] Visible focus ring on every focusable element.
- [ ] `Esc` closes dialogs and popovers.
- [ ] `Enter` submits forms; `Space` toggles checkboxes / activates buttons.
- [ ] Arrow keys navigate menus, tabs, and grids.

## 2. RTL

- [ ] Layout mirrors correctly in Arabic.
- [ ] Icons that imply direction (chevrons, arrows) flip.
- [ ] Numerics/dates render correctly in Arabic locale.
- [ ] No Bidi marker leakage in inputs (per `data-sanitization-policy`).
- [ ] Tooltips / popovers anchor to the correct side.

## 3. Responsive

- [ ] Mobile (≤ 480 px): no horizontal scroll, 44 px touch targets, table → card transform.
- [ ] Tablet (768 px): split layouts collapse appropriately.
- [ ] Desktop (≥ 1280 px): no wasted whitespace, max-width respected.

## 4. State Coverage

- [ ] Loading state visible within 200 ms of action.
- [ ] Empty state (no data ever) distinct from empty-filtered state (filters cleared CTA).
- [ ] Error state actionable (retry / contact / details).
- [ ] Slow network (Slow 4G): skeletons, no jank.
- [ ] Permission denied: explicit message, no blank screen.

## 5. Data Scale

- [ ] Large dataset (≥ 10 000 rows): virtualization or pagination active; no main-thread block > 200 ms.
- [ ] Sort / filter on large dataset stays responsive.

## 6. Theming & Tokens

- [ ] No hardcoded color utilities (verified by `check-token-usage.mjs`).
- [ ] Light + dark themes both pass (if dark is supported in the route).

## 7. Accessibility quick check

- [ ] axe / Lighthouse a11y score ≥ 95 on the route.
- [ ] Color contrast AA on text and interactive elements.
- [ ] Form fields have associated labels.

## 8. Telemetry / Cleanup

- [ ] No `console.*` calls in shipped code.
- [ ] No `TODO`/`FIXME` introduced in this PR without a tracking issue.

## Sign-off

| Reviewer | Date | Result |
|---|---|---|
| | | |
