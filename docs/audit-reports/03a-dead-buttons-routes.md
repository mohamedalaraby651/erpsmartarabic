# Frontend Completeness Audit: Dead Buttons & Broken Routes

This report identifies functional UI elements that lack implementation, point to missing routes, or contain placeholder logic.

## Summary of Findings

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 1     | Broken navigation to non-existent route |
| Medium   | 2     | Duplicate route systems for Quotations/Quotes |
| Low      | 1     | Console logs in user-facing success handlers |

---

## [CRITICAL] Broken Routes
User-facing CTAs that lead to 404 pages.

| File:Line | Snippet | Recommended Action |
|-----------|---------|--------------------|
| `src/pages/quotes/QuotesPage.tsx:97` | `onClick={() => navigate(`/quotes/${r.id}`)}` | **Route Missing**: `src/App.tsx` does not define `/quotes/:id`. It defines `/quotations/:id`. Update the navigate call to use the correct path. |

---

## [MEDIUM] Inconsistent Navigation Systems
Duplicate pages and inconsistent linking for the same business entity.

| File:Line | Snippet | Recommended Action |
|-----------|---------|--------------------|
| `src/components/layout/sidebar/SidebarNavSections.tsx:99` | `{ title: 'عروض الأسعار', ..., href: '/quotes', ... }` | The sidebar points to `/quotes`, but many parts of the app (Search, QuickActions, Customer Details) point to `/quotations`. Consolidate to one route system. |
| `src/components/navigation/QuickActions.tsx:43` | `href: '/quotations'` | Inconsistent with sidebar (`/quotes`). Standardize on the active quote system. |

---

## [LOW] Placeholder Logic & Dev Tooling
Minor implementation details or non-functional feedback.

| File:Line | Snippet | Recommended Action |
|-----------|---------|--------------------|
| `src/pages/install/InstallPage.tsx:40` | `if (import.meta.env.DEV) console.log('[PWA 2.0] ...');` | Minimal impact (DEV only), but consider replacing with a toast or removing before production cleanup. |

