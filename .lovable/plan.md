# Nazra Knowledge OS — Implementation Plan (OPA-KOS-001, CANDIDATE)

Scope: current project only. Plan-only round; nothing is changed until approval.

## (a) Verified findings (checked this round, commit a6499605)

- Routing: TanStack Start file routes under `src/routes/_app/**` (client-only `_app` layout, `ssr: false`). Admin pages live under `src/routes/_app/admin/*` wrapped by `admin.tsx` → `RoleGuard allow={['admin']}` (UX check only; real protection is RLS).
- Navigation: menu entries and Arabic labels are defined in `src/lib/navigation.ts` (items carry `roles: ['admin']`, plus a path→label map used by breadcrumbs).
- Data access: 44 repositories in `src/lib/repositories/`; UI must not import `@/integrations/supabase/**` (DEPENDENCY_RULES.md). Example: `savedViewsRepository.ts` encapsulates `user_saved_views`.
- Knowledge sources already in the repo (real, versioned with git):
  - `docs/adr/`: 23 ADR files + INDEX/README/TEMPLATE. ADRs use a header block (`Status`, `Date`, `Area`, `Supersedes`).
  - `docs/governance/`: 50 records (execution records, gates, exception register, OPA-CUST records).
  - `docs/risk-log/`: RISK-001, 003, 004, 005, 006, 007.
  - `docs/architecture/` (principles, baselines, roadmap), `scripts/audits/output/*.json` (fingerprints, baselines).
- Integrity gaps already visible (will be surfaced, not silently fixed):
  - `docs/adr/INDEX.md` lists 11 ADRs, while 23 ADR files exist.
  - Two files share id ADR-0028 (`0028-application-query-facades.md`, `0028-design-system-v2-and-ui-kit-sunset.md`).
- No Markdown renderer package is installed (no react-markdown/marked/remark in package.json). No existing `import.meta.glob` usage in `src/`.
- Not verified: any runtime execution of `SKILL.md` by Lovable; any existing approval workflow for documents (none found in code).

## (b) Placement and routes

Admin-only module under the existing admin area, same layout, guard and menu.

```text
/admin/knowledge                     Home / dashboard
/admin/knowledge/$kind               List (adr | contract | workstream | risk | evidence | verification | source)
/admin/knowledge/$kind/$id           Record details + backlinks + related
/admin/knowledge/integrity           Broken links, duplicate ids, index drift, Unknown fields
/admin/knowledge/impact              Change Impact register (manual, advisory)
/admin/knowledge/skills              Agent Skills guide + template (documentation only)
```

One menu item "المعرفة الهندسية" in `src/lib/navigation.ts` with `roles: ['admin']`, plus breadcrumb labels.

## (c) Data model and boundaries

Source of truth in Phase 1 = Markdown/JSON files already in the repository, bundled read-only at build time. No database, no network writes.

```text
docs/**/*.md ──(build-time import.meta.glob ?raw)──> src/lib/knowledge/sources.ts
      │
      ▼
src/domain/knowledge/  (pure: types, parser, id rules, link resolver, validators, status rules)
      │
      ▼
src/lib/repositories/knowledgeRepository.ts  (read-only adapter over bundled files + local drafts)
      │
      ▼
src/hooks/knowledge/*  (React Query: useKnowledgeIndex, useKnowledgeRecord, useKnowledgeIntegrity)
      │
      ▼
src/pages/admin/knowledge/*  +  src/components/knowledge/*  (presentation only)
```

Record (common properties):

```text
id            stable: ADR-0031, RISK-007, EVD-<path-hash>, CTR-OPA-CUST-UI-005 ...
kind          adr | contract | workstream | risk | evidence | verification | source
title, area, date, path (repo file), origin: "repo" | "local-draft" | "demo"
execution_status     not_started | in_progress | executed | unknown
verification_status  unverified | verified | failed | unknown
approval_status      pending | accepted | rejected | superseded | unknown
links[]       parsed [[ID]] wikilinks + "ADR-00xx"/"RISK-00x" references in text
supersedes[]
evidence      source, commit/version, date, scope, result, limitations, fingerprint (each may be Unknown)
```

Status rules (pure domain, unit-tested):
- The three statuses are independent; none is derived from another.
- Statuses are read only from explicit fields in the source file. Missing or unparseable → `unknown` / `unverified`, shown as such.
- `accepted` is shown only when the source file itself records it (e.g. ADR `Status: Accepted`), labelled "مُسجَّل في المصدر" with a link to the file. The UI has no control that sets `accepted`.
- Local drafts can never be `accepted` or `verified`; they are capped at `pending` / `unverified`.

Origins are never mixed silently:
- `repo`: from git-tracked files (default view).
- `local-draft`: created in the browser, stored in localStorage per user/device, badge "مسودة محلية — غير دائمة", excluded from counts unless toggled.
- `demo`: only on an explicit "عرض أمثلة" toggle, separate badge, never stored with real records. Phase 1 ships without demo data.

## (d) Files and layers affected (all new unless noted)

- `src/domain/knowledge/` — types.ts, ids.ts, parseFrontmatter.ts (ADR header + YAML front matter), links.ts, statusRules.ts, validate.ts, impact.ts, + tests.
- `src/lib/knowledge/sources.ts` — build-time glob over `docs/adr`, `docs/governance`, `docs/risk-log`, `docs/architecture`, selected `scripts/audits/output/*.json`.
- `src/lib/repositories/knowledgeRepository.ts` + export in `src/lib/repositories/index.ts` (edit).
- `src/hooks/knowledge/` — index, record, integrity, local drafts.
- `src/components/knowledge/` — StatusTriad (3 separate badges), RecordTable (reuses existing table/filter header patterns from customers/invoices), RecordDetail, BacklinksPanel, EvidenceCard, IntegrityReport, MarkdownView (safe, no raw HTML), ImportExportDialog.
- `src/pages/admin/knowledge/` — Home, List, Detail, Integrity, Impact, Skills pages.
- `src/routes/_app/admin/knowledge/` — index.tsx, $kind/index.tsx, $kind/$id.tsx, integrity.tsx, impact.tsx, skills.tsx.
- `src/lib/navigation.ts` (edit: one menu item + labels).
- Markdown rendering: either a small in-house safe renderer (headings, lists, code, tables, links, wikilinks) or a new dependency. Memory hard-stop says no new runtime dependency without an ADR, so the default is the in-house renderer; a library would need its own ADR.

## (e) Risks and dependencies

- Data freshness: Phase 1 shows docs as of the deployed build; edits to `docs/` appear after the next build. Shown as "نسخة المستندات: commit <sha> (وقت البناء)" when available, otherwise Unknown.
- Bundle size: docs are lazy-loaded only on knowledge routes (dynamic glob), never in the main bundle.
- Sensitive content: docs mention security findings (RISK-007, 2FA records). Admin-only access limits exposure; still, `docs/security/**` is excluded from Phase 1 sources by default, pending decision.
- Parser fragility: formats differ across docs; unparseable fields fall back to Unknown and are listed in the Integrity page.
- Local drafts are per browser, lost when storage is cleared, and are not shared; this is stated in the UI.
- Duplicate ADR-0028 and INDEX drift will show as integrity errors on day one. That is intended, and does not block Phase 1 acceptance.

## (f) Phases and acceptance criteria

Phase 1 — Read-only knowledge browser (UI prototype over real repo docs)
- Home: counts per kind and status triad, integrity summary, latest records.
- Lists with search, sort and filters by kind/area/status/origin; details with backlinks and related records.
- Integrity page: broken `[[ID]]` links, duplicate ids, files missing from ADR INDEX, Unknown fields.
- Accept: no edits outside the files in (d); unit tests for id rules, parser, link resolver, status rules (including "accepted only from source", "drafts capped"); zero unresolved links in the parser's own fixtures; RTL check at 360/768/1280; keyboard navigation and labelled badges; test that the default list contains no `demo` or `local-draft` records.

Phase 2 — Evidence Registry, Change Impact and Skills guide
- Evidence cards built from governance records and audit JSON; every missing field shows Unknown.
- Change Impact: manual entries (local drafts) linking a change to records, with the label "استرشادي — لا يكتشف تبعيات الكود تلقائيًا".
- Skills page: SKILL.md template and authoring guide, labelled "دليل توثيقي — لم يُتحقق من تشغيله كمهارة runtime".
- Accept: tests for evidence field validation and the Unknown fallback; integrity rules cover impact links.

Phase 3 — Safe import/export (optional)
- Export a filtered set as Markdown or JSON (with a schema version).
- Import into local drafts only: preview, diff and explicit confirmation. Id conflicts are rejected, nothing is overwritten, and imported records are capped at pending/unverified.
- Accept: tests for import validation, conflict rejection and no-overwrite.

Phase 4 — Persistent storage and approval governance (separate later proposal, not built now)
- A design document only: tenant-less, platform-level `knowledge_records` / `knowledge_approvals` tables, admin-only RLS, an approval action recording approver, time and evidence link, plus a migration and an ADR.
- Requires its own explicit approval under Smart Freeze before any DB work.

## (g) Will not change

- Ledger, payments, stock movements, sync, tenant authority, permissions, roles, RLS, migrations, tables, RPCs, Edge Functions, server functions.
- Existing docs content: read only. The ADR INDEX drift and the duplicate 0028 are reported, not fixed.
- Frozen contracts, F2, project structure, existing pages and the design system (reused, not altered).
- No direct backend access from UI, no business logic in components, no new Query Service (single-source reads only), and no new runtime dependency without an ADR.

## Technical notes

- Glob: `import.meta.glob('/docs/**/*.md', { query: '?raw', import: 'default' })` (lazy), plus `/scripts/audits/output/*.json`. Both are inside the Vite root; this needs a build check to confirm the paths outside `src/` resolve in the TanStack Start build (verified as Phase 1 step 1, with a fallback of a generated `src/lib/knowledge/manifest.json` from a script).
- Ids: ADR from the filename number (duplicates flagged, the second gets the suffix `-b` for display only); RISK from the filename; governance records from the filename slug; evidence ids are a stable hash of path + section.
- Commit sha at build time: shown only if exposed through an existing env/version file (`public/version.json` exists, contents to be checked); otherwise Unknown.
