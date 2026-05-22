# الخطة الموحّدة الشاملة — نضوج وتثبيت مشروع ERP Smart Arabic / Nazra

> دمج خطة النضوج (6 مراحل) + خطة التثبيت المعماري (11 مرحلة) في **خارطة طريق واحدة من 7 مراحل** (10–12 أسبوعًا).  
> الفلسفة: لا إعادة كتابة، لا كسر تدفقات، تنفيذ تدريجي ملف-ملف مع الحفاظ على RLS متعدد المستأجرين، RTL العربية، Mobile-first، ومنطق المحاسبة بالكامل.

---

## خط الأساس المُقاس (Baseline)


| المؤشر                                           | الحالي                                               | الهدف |
| ------------------------------------------------ | ---------------------------------------------------- | ----- |
| ملفات تحوي `supabase.from()` خارج repos/services | **63**                                               | **0** |
| `as any` في الإنتاج                              | 111                                                  | 0     |
| `console.log/warn`                               | 45                                                   | 0     |
| ملفات إنتاج > 500 سطر                            | 4 (854/637/546/543/509)                              | 0     |
| Supabase Linter WARN                             | 76                                                   | 0     |
| Repositories موجودة                              | 5 (customer, supplier, invoice, product + relations) | +15   |


---

## PHASE 0 — Baseline & Guardrails (يومان)

- تثبيت `rollup-plugin-visualizer` لقياس bundle.
- تشغيل `supabase--linter` وتخزين 76 WARN كـ baseline.
- توليد عدّادات (`supabase.from`, `as any`, `console.log`) مُؤرشفة.
- رفع قاعدة ESLint الحالية (uiCopy) إلى مستوى `error`.
- إضافة `no-restricted-imports` يمنع `@/integrations/supabase/client` خارج `repositories/`, `services/`, `lib/financial-engine/`, `hooks/useTenant.ts`.
- لقطة Lighthouse (LCP/CLS/INP) للمقارنة لاحقًا.

---

## PHASE 1 — Repository Boundary Enforcement (أسبوع 1–2)

### المعمار الجديد

```text
pages/ + components/   ← UI فقط
        ↓
hooks/                 ← useQuery/useMutation
        ↓
services/              ← orchestration (multi-repo + side effects)
        ↓
repositories/          ← الموقع الوحيد لـ supabase.from()
   • TenantContext تلقائي
   • Pagination/Sort/Filter موحّد
   • mapRepoError → رسائل عربية
   • DTOs من types/entities.ts
        ↓
   Supabase client
```

### العقد الأساسي

`src/lib/repositories/_base.ts` يوفّر:

- `BaseRepository<T, F, S>` interface (findAll/findById/create/update/delete).
- `withTenant(query)` helper يحقن `tenant_id`.
- `mapRepoError(err)` رسائل موحّدة.
- `RepoListParams`/`RepoListResult` typed.

### Repositories الجديدة (15) — مرتبة بالأولوية المالية


| Repository                                    | يستوعب                                                    | أولوية |
| --------------------------------------------- | --------------------------------------------------------- | ------ |
| `paymentRepository`                           | pages/payments, components/payments                       | 🔴     |
| `creditNoteRepository`                        | pages/credit-notes, components/credit-notes               | 🔴     |
| `quotationRepository` (دمج quotes+quotations) | pages/quotations, pages/quotes, components/quotations     | 🔴     |
| `salesOrderRepository`                        | pages/sales-orders, components/sales-orders               | 🔴     |
| `purchaseOrderRepository`                     | pages/purchase-orders, components/purchase-orders         | 🔴     |
| `logisticsRepository`                         | hooks/logistics/* (3), components/logistics               | 🟠     |
| `employeeRepository`                          | components/employees, hooks/employees, pages/attendance   | 🟠     |
| `taskRepository`                              | pages/tasks                                               | 🟠     |
| `reportRepository`                            | pages/reports, components/reports, useReportsData         | 🟠     |
| `inventoryRepository` (توسيع)                 | pages/inventory, pages/products                           | 🟢     |
| `adminRepository`                             | pages/admin/* (5)                                         | 🟢     |
| `platformRepository`                          | pages/platform                                            | 🟢     |
| `syncRepository`                              | pages/sync, useOfflineData, useOfflineMutation            | 🟢     |
| `printRepository`                             | components/print (3)                                      | 🟢     |
| `notificationRepository`                      | useAlertNotifier, useDuplicateInvoice, useConvertDocument | 🟢     |


### خطوات لكل ملف

1. توسعة/إنشاء repo.
2. hook (`use<Entity>List/Detail/Mutations`) يستدعي repo فقط.
3. استبدال `supabase.from()` في UI بـ hook.
4. تشغيل Vitest + Playwright للـ journey المتأثر.
5. Commit مستقل (سهولة rollback).

### معايير القبول

- `rg "supabase\.from\("` خارج repos/services = 0.
- ESLint `no-restricted-imports` مُفعّل بمستوى `error`.
- صفر تراجع E2E.

---

## PHASE 2 — Code Quality & Type Safety (أسبوع 3)

### Refactor الملفات الكبيرة

- `CustomerDetailsPage.tsx` (854) → header + tabs + sidebar + `useCustomerDetailsPage` hook.
- `CustomerListCard.tsx` (543) → CardHeader + KPIs + Actions.
- `arabicFont.ts` (546) → `fonts/loader.ts` + `fonts/registry.ts`.
- `pdfGenerator.ts` (509) → `pdf/layout.ts` + `pdf/sections/*` + `pdf/theme.ts`.
- (sidebar.tsx shadcn — يُترك).

### Business Logic Extraction → `src/domain/`

- `domain/invoice/{calculations,validation}.ts`
- `domain/inventory/constraints.ts`
- `domain/accounting/period.ts`
- `domain/approval/workflow.ts`
- Pure functions، Zod schemas، 100% قابلة للاختبار بدون React.

### Type Safety

- استبدال 111 `as any` بأنواع من `types/entities.ts`.
- Discriminated unions: `Invoice.status`, `Payment.status`, `Journal.posting_state`.
- تفعيل `noUncheckedIndexedAccess` في tsconfig.

### Logging

- استبدال 45 `console.log` بـ `logErrorSafely`/`emitTelemetry`.
- إزالة prop drilling عبر context محلي لكل feature.
- Zod schemas لكل form (invoice/payment/quotation/credit-note).

---

## PHASE 3 — Accounting Integrity & Offline Safety (أسبوع 4–5)

### Accounting Hardening

- مراجعة `financial-engine/journal.service.ts`:
  - كل posting داخل `BEGIN/COMMIT` (RPC atomic).
  - فحص `SUM(debit) = SUM(credit)` قبل insert.
  - فحص الفترة المفتوحة عبر `period.service`.
  - رفض UPDATE/DELETE على journals مرحّلة — reversal فقط.
- إضافة `journal_idempotency_key` (UUID) لكل posting.
- اختبار `__tests__/accounting/double-entry.test.ts` للـ 3 invariants.

### Offline Sync Hardening

- كل عملية queue: `client_op_id` (UUID) + `fingerprint = sha256(entity+payload)`.
- Edge functions مالية تفحص `Idempotency-Key` في `operation_idempotency` قبل التنفيذ.
- Optimistic concurrency: عمود `version` + `WHERE version = :expected`.
- TTL 24h على idempotency keys + `pg_cron` للتنظيف.
- اختبار محاكاة فقد اتصال + replay → 0 تكرار.

---

## PHASE 4 — Security Hardening (أسبوع 6)

- إغلاق 76 WARN عبر migrations:
  - `function_search_path_mutable` → `SET search_path = public`.
  - `auth_otp_long_expiry`.
  - `auth_leaked_password_protection`.
- تشفير `user_2fa_settings.secret` بـ `pgp_sym_encrypt`.
- Views آمنة لـ PII: `customers_safe_view`, `employees_safe_view`, `suppliers_safe_view`.
- تقييد `activity_logs` INSERTs بـ SECURITY DEFINER فقط.
- كل `SECURITY DEFINER` يبدأ بـ `tenant_id = current_tenant()`.
- اختبار `tenant-isolation.spec.ts` يفشل قراءة tenant آخر.

---

## PHASE 5 — Functional Gaps & UX Polish (أسبوع 7–8)

### إغلاق الفجوات الوظيفية

- دمج `quotes` + `quotations` (DB + UI).
- مركز إشعارات داخلي (notification center).
- صفحة "إغلاق فترة محاسبية" (الـ backend موجود).
- صفحة "Offline Sync Status" (تستخدم `sync_logs` + `useOfflineSync`).
- استكمال CRUD لـ `sales-pipeline` (Leads/Opportunities).
- واجهة موحّدة لـ `attachments`.
- Kanban لجدول `tasks`.
- إزالة/استكمال routes ميتة: `protocol`, `share`, `install`.

### Performance & Cache

- `queryKeys` factory مركزي (توسيع).
- `staleTime`/`gcTime` من `queryConfig.ts` فقط.
- Virtualization للقوائم > 200 صف.
- Prefetch on hover للروابط الجانبية.
- إزالة waterfalls بـ `Promise.all` في services.
- `React.memo` + `useStableCallback` داخل صفوف القوائم.
- خفض default `useInfiniteCustomers` من 1000 إلى 50/صفحة.

### UI Governance

- `MobileBottomNav` من `h-12` إلى `h-11` (44px touch).
- توحيد spacing scale (4/8/12/16/24).
- توحيد EmptyStates + Skeletons بأبعاد حقيقية.
- RTL audit: `start`/`end` بدل `left`/`right`.
- `uiCopy.ts` مصدر وحيد للنصوص (ESLint `error`).

---

## PHASE 6 — Observability & Testing (أسبوع 9)

- توسيع `runtimeTelemetry` ليرسل لـ edge function `log-event`.
- `withInstrumentation(repoMethod)` لقياس latency استعلامات DB.
- ErrorBoundary لكل route عبر `PageWrapper`.
- جاهزية Sentry: محوّل `emitTelemetry → Sentry.captureException` خلف flag.
- صفحة observability داخلية (slow_queries_log + sync_logs + telemetry).
- Vitest ≥ 80% coverage.
- Playwright لكل journey رئيسي + tenant isolation.
- Storybook للمكونات المشتركة.

---

## PHASE 7 — Documentation & Release (أسبوع 10)

توليد الوثائق في `docs/`:

1. `refactoring-report.md` — قبل/بعد لكل entity (LOC, تعقيد, اختبارات).
2. `security-fixes.md` — كل WARN أُغلق + RLS قبل/بعد.
3. `performance-optimizations.md` — LCP/CLS/INP قبل/بعد + bundle size.
4. `accounting-integrity.md` — invariants + reversal flow + fiscal lock.
5. `engineering-governance.md` — توسيع `engineering-standards.md` بقواعد PR review.

CI/CD checks + smoke tests + إصدار `v1.0.0`.

---

## مصفوفة القبول النهائية (Definition of Done)


| البند                                                | الهدف                    |
| ---------------------------------------------------- | ------------------------ |
| `supabase.from()` خارج repos/services                | 0                        |
| ESLint `no-restricted-imports` للـ supabase client   | فعّال (error)            |
| `as any` في كود الإنتاج                              | 0                        |
| `console.log` في كود الإنتاج                         | 0                        |
| ملفات إنتاج > 500 سطر                                | 0                        |
| Supabase Linter WARN/ERROR                           | 0                        |
| Double-entry invariants tested                       | ✓                        |
| Idempotency على كل posting/payment                   | ✓                        |
| LCP / CLS / INP                                      | < 2.5s / < 0.1 / < 200ms |
| Tenant isolation E2E                                 | 100% pass                |
| Touch targets موبايل                                 | ≥ 44px                   |
| Vitest coverage                                      | ≥ 80%                    |
| كل route لديه PageWrapper + ErrorBoundary + Skeleton | 100%                     |
| Routes ميتة (protocol/share/install)                 | مستكملة أو محذوفة        |


---

## التسلسل الزمني

```text
P0 (2د) → P1 (أسبوع 1–2) → P2 (أسبوع 3) → P3 (أسبوع 4–5)
       → P4 (أسبوع 6) → P5 (أسبوع 7–8) → P6 (أسبوع 9) → P7 (أسبوع 10)
```

كل مرحلة = batch قابل للمراجعة + اختبارات خضراء قبل الانتقال.

---

## نقطة البدء الفورية بعد الموافقة

**Phase 0 (يومان)** ثم مباشرة **Phase 1**:

1. `src/lib/repositories/_base.ts` + helpers.
2. أول repo حسب الأولوية المالية: **paymentRepository** (أعلى مخاطرة).
3. ثم creditNote → quotation (دمج) → salesOrder → purchaseOrder.
4. تكرار النمط حتى آخر entity ثم تفعيل ESLint rule المانعة.

You are now operating as a Principal ERP Architect, Senior Refactoring Engineer, and PostgreSQL Performance Specialist. Your absolute mission is to execute the Unified Maturity and Architectural Stabilization Plan for our production-grade Arabic ERP SaaS platform (React, TypeScript, Tailwind, Supabase, PostgreSQL).

&nbsp;

CRITICAL DIRECTIVES:

- DO NOT rewrite the system from scratch. DO NOT break existing business flows.

- Preserve Arabic RTL UX, mobile-first layouts, multi-tenant isolation, and core accounting integrity.

- Execute all changes incrementally, file-by-file, maintaining clean Git-ready atomic commits.

&nbsp;

Please evaluate the codebase against the measured baseline KPIs and execute the roadmap strictly according to the following phased specifications:

&nbsp;

PHASE 0 — BASELINE & GUARDRAILS (Duration: 2 Days)

- Establish bundle monitoring using `rollup-plugin-visualizer` and document the 76 Supabase Linter warnings as the baseline.

- Freeze code anti-patterns by raising ESLint rule `uiCopy` to error level.

- Enforce strict import protection via `no-restricted-imports` to prevent calling the Supabase client (`@/integrations/supabase/client`) outside the `/repositories`, `/services`, `/lib/financial-engine/`, and `hooks/useTenant.ts` boundaries.

&nbsp;

PHASE 1 — REPOSITORY BOUNDARY ENFORCEMENT (Weeks 1-2)

- Migrate all data access out of the UI. Establish the core repository interface contract inside `src/lib/repositories/_base.ts` supporting `BaseRepository<T, F, S>` with `withTenant(query)` injection, pagination/filtering abstraction, and localized `mapRepoError` handling.

- Build and implement the 15 missing repositories and their corresponding query hooks, ordered strictly by financial priority:

  1. Financial/High-Risk: `paymentRepository`, `creditNoteRepository`, `quotationRepository` (merged from quotes+quotations), `salesOrderRepository`, `purchaseOrderRepository`.

  2. HR & Logistical: `logisticsRepository`, `employeeRepository`, `taskRepository`, `reportRepository`.

  3. Core Operations & Platform: `inventoryRepository`, `adminRepository`, `platformRepository`, `syncRepository`, `printRepository`, `notificationRepository`.

- Acceptance Criteria: `rg "supabase\.from\("` outside repositories/services must equal exactly ZERO.

&nbsp;

PHASE 2 — CODE QUALITY & TYPE SAFETY (Week 3)

- Refactor and split oversized files (>500 lines) into compact UI presenters, custom containers, and local hooks: `CustomerDetailsPage.tsx` (854 lines), `CustomerListCard.tsx` (543 lines), `arabicFont.ts` (546 lines), and `pdfGenerator.ts` (509 lines).

- Extract pure business logic out of components and place into `src/domain/` (e.g., invoice calculations, inventory constraints, fiscal period rules).

- Eradicate 111 instances of `as any` with strict models from `types/entities.ts` and activate `noUncheckedIndexedAccess` in tsconfig.

- Replace all 45 `console.log` statements with secure telemetry emitting hooks (`logErrorSafely`).

&nbsp;

PHASE 3 — ACCOUNTING INTEGRITY & OFFLINE SAFETY (Weeks 4-5)

- Harden `financial-engine/journal.service.ts`: Enforce that all journal entries are atomic (RPC wrapped in BEGIN/COMMIT), enforce zero-balance checks (`SUM(debit) == SUM(credit)`), prevent modifications on posted records (reversal-only flow), and attach UUID-based `journal_idempotency_key` tokens.

- Secure the offline sync engine: Enforce optimistic concurrency control on local writes using a `version` schema constraint, tag local mutations with dynamic fingerprints, and configure a server-side 24-hour TTL table for transaction deduplication.

&nbsp;

PHASE 4 & 5 — SECURITY HARDENING, FUNCTIONAL GAPS & UX POLISH (Weeks 6-8)

- Resolve all 76 Supabase linter issues. Enforce explicit search paths (`SET search_path = public`) for all SECURITY DEFINER functions and inject multi-tenant validation server-side.

- Clean and fix structural UX features: Unify the responsive spacing system. Decrease the `MobileBottomNav` vertical height down to `h-11` (44px target) to optimize mobile screen real estate.

- Implement real-dimension Skeleton Loaders across all metrics, graphs, and tabular layouts to maximize loading UX.

- Complete missing CRUD paths for the sales pipeline, tasks Kanban, and the "Fiscal Period Locking" dashboard interface.

&nbsp;

PHASE 6 & 7 — OBSERVABILITY, TESTING & DOCUMENTATION (Weeks 9-10)

- Ensure total application coverage with Error Boundaries via a localized `PageWrapper`.

- Reach ≥80% Vitest coverage and pass localized Playwright E2E integration routines ensuring data isolation.

- Generate standard governance documentation under `docs/`: `refactoring-report.md`, `security-fixes.md`, `performance-optimizations.md`, `accounting-integrity.md`, and `engineering-governance.md`.

&nbsp;

Immediate Next Step: 

Analyze the current directory structure and file setup for `src/lib/repositories/` and the components under `pages/payments`. Initialize Phase 0 and lay out the core architecture for `src/lib/repositories/_base.ts` alongside our top financial priority: `paymentRepository`. Present the implementat

ion strategy before applying code mutations.