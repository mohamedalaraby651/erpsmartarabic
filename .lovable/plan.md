# Frontend Modernization — Track A + Track C

Non-breaking structural refactor of the shell + design tokens. Zero business-logic changes; targets keeping 1187/1187 tests green.

## Track C — Design System v3 & Token Cleanup

1. **Delete** `src/App.css` (dead Vite boilerplate; not imported by `main.tsx`, verified). Removes a 42-line noise file.
2. **Extract motion →** `src/styles/motion.css`: move every `@keyframes` block + the `.animate-*` utility classes currently embedded in `src/index.css` (~lines 190–550 region: fadeIn, slideIn/Out, shimmer, ripple, pulseGlow, scaleBounce, bounceIn, progress, pingSlow, shimmerMove, pulseSubtle, slideUp/Down, scaleIn, pulseRing, skeletonShimmer, staggerFadeIn, flashSuccess/Error, voicePulse, sheetUp). Keep them inside `@layer utilities`. Import via `@import './styles/motion.css';` at the top of `src/index.css`. **Untouched**: HSL tokens, `:root`/`.dark`, surface/elevation system, `data-density` rules, RTL/Cairo, sheet primitives — kept inline in `index.css`.
3. **Tablet breakpoint in** `tailwind.config.ts`: add `screens: { xs: '420px', tablet: '900px' }` so we get a real tablet tier between `sm (640)` and `md (768)` / `lg (1024)`. Also add `'3xl': '1600px'` for wide dashboards.
4. **Container upgrade**: bump the `theme.container.screens['2xl']` from `1400px` → `1600px`, and introduce a reusable `.container-wide` utility (`max-w-[1600px] mx-auto px-4 tablet:px-6 lg:px-8`) in `index.css @layer components`. Apply it to the `<main>` wrapper inside the new shell only (no per-page rewrites in this phase).

## Track A — Unified Adaptive Shell & Navigation

5. `AdaptiveShell` **(new) replaces the dual branch in** `AppLayout.tsx`: single render tree using CSS media queries instead of branching on `useIsMobile()`. Strategy:
  - One DOM tree always renders Sidebar + MobileHeader + MobileBottomNav.
  - Visibility controlled via Tailwind responsive utilities: sidebar → `hidden lg:block`, mobile header → `lg:hidden`, bottom nav → `lg:hidden`, main padding shifts via `lg:mr-[260px]` (or `lg:mr-[70px]` when collapsed).
  - `useIsMobile()` is kept only for things that genuinely need JS state (e.g., FABMenu prefetch gating), no longer for rendering switches.
  - `AdaptiveContainer` (already exists) is retained for components that need different DOM trees per platform; the shell itself stops using it.
6. **Declarative** `NavLink` **matching in** `SidebarNavSections.tsx` + `MobileDrawer`:
  - Replace `location.pathname === item.href` and the `isItemActive`/`isSectionActive` helpers with `<NavLink end={false}>` + `useMatch(item.href + '/*')`, so `/accounting/journals/123` correctly illuminates `/accounting/journals`.
  - Section "hasActiveItem" derived from the same matchers.
  - `NavItemWithBadge` already wraps an anchor — convert its inner `<a>` to the existing `src/components/NavLink.tsx` compat wrapper to inherit nested matching.
7. **Shared layout primitives** under `src/components/layout/shared/`:
  - `UserMenu.tsx` (profile dropdown — extracted from `AppHeader`).
  - `NotificationsBell.tsx` (extracted from `AppHeader` + `MobileHeader`).
  - `GlobalSearchTrigger.tsx` (unified search button — desktop renders inline input, mobile renders icon → `/search`).
  - `AppHeader` and `MobileHeader` are slimmed to layout shells composing these primitives; both behaviors preserved 1:1.
8. **Mobile TenantSelector gap**:
  - Add `TenantSelector` to the top of `MobileHeader` (compact variant: icon + truncated tenant name → tap opens the existing dropdown). Already exists inside `MobileDrawer` — keep both, since the header gives one-tap access without opening the drawer.
  - Ensure `TenantSelector` hides itself when user has only one tenant (existing behavior preserved).

## Track Stability — Tokens & Tests

9. **Preserve all tokens**: no edits to HSL variables, `data-density` blocks, `--surface-*`, `--shadow-*`, `--ease-*`, `--sidebar-*`. Motion file is purely utility-class movement.
10. **Test suite**: run `bunx vitest run` after the refactor. Layout tests reference roles/labels, not the dual-branch structure, so the unified shell should remain green. If any snapshot/DOM-position test fails (likely MobileHeader composition), update assertions minimally to the new primitive structure — no logic shifts.

## Technical Details

**Files created**

- `src/styles/motion.css`
- `src/components/layout/AdaptiveShell.tsx`
- `src/components/layout/shared/UserMenu.tsx`
- `src/components/layout/shared/NotificationsBell.tsx`
- `src/components/layout/shared/GlobalSearchTrigger.tsx`

**Files edited**

- `src/index.css` (remove motion blocks, add `@import './styles/motion.css'`, add `.container-wide` component class)
- `tailwind.config.ts` (add `screens`, raise container `2xl`)
- `src/components/layout/AppLayout.tsx` (replace dual branch with `<AdaptiveShell>`)
- `src/components/layout/AppHeader.tsx` (compose shared primitives)
- `src/components/layout/MobileHeader.tsx` (add TenantSelector + shared primitives)
- `src/components/layout/MobileDrawer.tsx` (NavLink matching)
- `src/components/layout/sidebar/SidebarNavSections.tsx` (NavLink matching + nested route detection)
- `src/components/sidebar/NavItemWithBadge.tsx` (use NavLink wrapper)

**Files deleted**

- `src/App.css`

## Out of Scope

- No business-logic changes, no repository/hook edits, no schema/RPC work.
- Per-page container width rewrites (only the shell main wrapper changes). A follow-up Track C2 can sweep individual page wrappers.
- shadcn `Sidebar` migration (kept custom sidebar; only matching logic + primitive extraction).
- Act as a Principal Frontend Architect and Premium UI/UX Expert specialized in RTL Tailwind applications. We are executing "Frontend Modernization: Track A (Unified Adaptive Shell) and Track C (Design System v3 & Token Cleanup)". This is a strict structural refactor to eliminate layout duplication and modernize tokens without introducing any business logic modifications. 

Please systematically implement the following adjustments while keeping our 1187/1187 test suite flawlessly green:

&nbsp;

1. Track C — Design System v3 & Token Cleanup:

- Delete the dead file `src/App.css` (the unimported Vite boilerplate noise).

- Create a clean file `src/styles/motion.css`. Move all `@keyframes` blocks and their matching `.animate-*` utility classes from `src/index.css` (including fadeIn, slideIn/Out, shimmer, ripple, pulseGlow, scaleBounce, bounceIn, progress, pingSlow, shimmerMove, pulseSubtle, slideUp/Down, scaleIn, pulseRing, skeletonShimmer, staggerFadeIn, flashSuccess/Error, voicePulse, sheetUp) into this new file wrapped inside `@layer utilities`.

- In `src/index.css`: Add `@import './styles/motion.css';` at the absolute top. Keep all HSL variables, `:root/.dark`, surface/elevation systems, data-density compact rules, and RTL Cairo typography untouched. Add a new reusable component class under `@layer components`:

  `.container-wide { max-width: 1600px; margin-left: auto; margin-right: auto; padding-left: 1rem; padding-right: 1rem; } @media (min-width: 900px) { .container-wide { padding-left: 1.5rem; padding-right: 1.5rem; } } @media (min-width: 1024px) { .container-wide { padding-left: 2rem; padding-right: 2rem; } }`

- Update `tailwind.config.ts` to add custom screens: `xs: '420px'`, `tablet: '900px'`, and `'3xl': '1600px'`. Bump `theme.container.screens['2xl']` from 1400px to 1600px.

&nbsp;

2. Track A — Shared Layout Primitives:

Create the following lightweight, presentation-only components under `src/components/layout/shared/`:

- `UserMenu.tsx`: Extract the user profile dropdown from `AppHeader`.

- `NotificationsBell.tsx`: Extract the notifications button/badge markup shared between desktop/mobile headers.

- `GlobalSearchTrigger.tsx`: Extract unified search button trigger (inline input text grid for desktop, icon trigger routing to `/search` for mobile devices).

- Slim down `src/components/layout/AppHeader.tsx` and `src/components/layout/MobileHeader.tsx` to compose these shared primitives 1:1.

&nbsp;

3. Track A — Mobile Header Tenant Upgrade & NavLink Matching:

- In `src/components/layout/MobileHeader.tsx`: Inject the existing `TenantSelector` at the top bar in a compact state (Icon + truncated active company name, tapping opens the current tenant dropdown). Ensure it hides gracefully when the user owns only 1 tenant (matching existing desktop behavior).

- In `src/components/layout/sidebar/SidebarNavSections.tsx` & `src/components/layout/MobileDrawer.tsx`: Eliminate `location.pathname === item.href` and imperative `isItemActive` checks. Replace them with standard React Router `<NavLink end={false}>` paired with `useMatch(item.href + '/*')` so that a sub-route like `/accounting/journals/123` correctly illuminates the parent navigation link `/accounting/journals`. Derive the section's `hasActiveItem` state using the same matching rule.

- In `src/components/sidebar/NavItemWithBadge.tsx`: Convert the inner layout anchor `<a>` to use the application's native `src/components/NavLink.tsx` wrapper to clean up nested matching.

&nbsp;

4. Track A — Unified Adaptive Shell:

- Create `src/components/layout/AdaptiveShell.tsx` to completely replace the imperative dual-rendering branches inside `AppLayout.tsx`. 

- Construct a single, semantic DOM render tree controlled cleanly by Tailwind CSS responsive utility classes instead of JS window resize listeners:

  - Sidebar: Hardwired to `hidden lg:block` (with appropriate `lg:mr-[260px]` or collapsed `lg:mr-[70px]` body padding constraints applied dynamically).

  - MobileHeader & MobileBottomNav: Hardwired to `lg:hidden`.

  - Wrap the main inner component viewport render block `<main>` with our new `.container-wide` class.

- Update `src/components/layout/AppLayout.tsx` to remove its dual JS code branch and return this new `<AdaptiveShell>` primitive cleanly.

&nbsp;

5. Verification and Verification Testing:

- Maintain all existing HSL coloring, elevation tokens, and layout widths. 

- Execute `bunx vitest run` at the end to ensure the global 1187 green test suite remains flawless. If any DOM positioning or MobileHeader assertion breaks due to the primitive extraction, perform the minimum required updates to the test files to align with the new structure while maintaining identical logical expectations.

&nbsp;