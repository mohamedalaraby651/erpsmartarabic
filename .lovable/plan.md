# Plan: Public landing page at "/" and dashboard at "/dashboard"

Task 2 has not been described yet; it will be added to this plan when received.

## What you will see
- Signed-out visitors opening "/" see the existing Arabic landing page (hero, features, sign-in/sign-up button to /auth).
- Signed-in users opening "/" go straight to /dashboard.
- The dashboard lives at /dashboard; sidebar, mobile menu, bottom bar, breadcrumbs and "back to home" buttons inside the app point there.
- Signed-out users opening /dashboard or any app page go to /auth, then return to that page after signing in.
- No loop and no flash: "/" shows a short loading state while the session is checked.

## Steps
1. Routes
   - Move `src/routes/_app/index.tsx` to `src/routes/_app/dashboard.tsx` (path `/dashboard`, same head metadata).
   - New `src/routes/index.tsx` (public, `ssr: false`): reads `useAuth()`; while loading shows a spinner; if user -> `navigate('/dashboard', replace)`; else renders `LandingPage`. Own head() with Arabic title/description/og tags.
   - `src/routes/landing.tsx` redirects to "/" (keeps old links working). `[index].tsx` keeps redirecting to "/".
2. Links to the old dashboard ("/" inside the app) -> "/dashboard": AppSidebar, MobileDrawer, MobileBottomNav, SidebarNavSections active check, SmartBreadcrumbs home link and hidden-on list, PageHeader, useBreadcrumbs, CommandBar, useCustomShortcuts (Alt+1), WorkspaceTabsBar fallback, ForbiddenPage, ShareTarget, OpenFile, Protocol, ResetPassword, PlatformLayout, error boundaries, __root not-found link, FABMenu context.
3. Sign-in
   - Auth page: default destination after login becomes /dashboard (keeps safe `next` handling); if already signed in, goes to /dashboard.
   - AppLayout guard unchanged in approach; it sends the current path as `next` to /auth.
   - Landing page buttons point to /auth.
4. Check
   - Playwright: signed-out "/" shows landing, "/dashboard" and "/customers" go to /auth; signed-in "/" goes to /dashboard, sidebar home link active; no repeated navigation.
   - Run existing navigation/breadcrumb tests, update ones that expect "/" as home.

## Technical notes
- Frontend only; no database, roles or security changes.
- Client-side guard approach kept (AppLayout `useAuth` + `_app` `ssr: false`).
