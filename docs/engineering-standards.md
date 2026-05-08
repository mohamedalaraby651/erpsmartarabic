# معايير الهندسة — ERP Smart Arabic / Nazra
> Phase 9 deliverable. مرجع إلزامي لكل المساهمات.

## 1. بنية المجلدات
```text
src/
  components/   UI presentational فقط — لا fetch، لا منطق أعمال
  features/     تركيب feature-level (يجمع UI + hooks + actions لمجال واحد)
  domain/       أنواع وقواعد عمل خالصة (pure functions, Zod schemas)
  services/     Orchestration: ينسّق repositories + edge functions + side effects
  repositories/ وصول DB فقط — كل supabase.from() يعيش هنا
  hooks/        React hooks (state, queries, mutations)
  lib/          أدوات مشتركة (utils, observability, formatters)
  pages/        Route entries — أرفع 200 سطر يحتاج تجزئة لـ feature
```

## 2. قواعد الملفات
- **حد أقصى 500 سطر** لأي ملف React/TS (باستثناء `types.ts` المولّد و shadcn).
- ملف واحد = مكون واحد رئيسي (sub-components خاصة OK).
- `kebab-case` لمجلدات features، `PascalCase` للمكونات، `camelCase` للـ hooks/utils.

## 3. قواعد المكونات
- لا `supabase.from()` في `components/` أو `pages/` — استخدم repository → service → hook.
- لا منطق محاسبي خارج `lib/financial-engine/`.
- Memoize بـ `React.memo` للعناصر داخل قوائم > 50 صف.
- Virtualize القوائم > 200 صف بـ `useVirtualList`.

## 4. قواعد الـ Hooks
- اسم يبدأ بـ `use*`.
- لا side effects في render — فقط داخل `useEffect`/`useMutation`.
- استخدم `queryKeys` factory المركزي (لا strings مكتوبة يدويًا).
- `staleTime` و `gcTime` من `lib/queryConfig.ts` لا قيم سحرية.

## 5. قواعد قاعدة البيانات (Migrations)
- كل تغيير = migration واحد عبر `supabase--migration`.
- لا `ALTER DATABASE postgres`.
- لا تعديلات على schemas: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- كل جدول جديد:
  - عمود `tenant_id uuid not null`.
  - RLS `enable`.
  - 4 سياسات (SELECT/INSERT/UPDATE/DELETE) كلها تفحص `tenant_id`.
  - `created_at`, `updated_at` + trigger تحديث.
- كل دالة `SECURITY DEFINER`: `SET search_path = public`.
- لا CHECK constraint بقيم زمنية متغيرة — استخدم validation triggers.
- لا triggers على schemas المحجوزة.

## 6. قواعد Edge Functions
- ملف واحد `index.ts` لكل function.
- Zod validation على body دومًا.
- CORS من SDK (`corsHeaders`).
- JWT validation in-code عبر `getClaims()` للدوال غير العامة.
- العمليات المالية تحوي `Idempotency-Key` header check.
- استجابات الخطأ تتضمن `corsHeaders`.
- لا `supabase.rpc('execute_sql')` ولا أي SQL ديناميكي.

## 7. قواعد الأنواع
- استورد من `src/types/entities.ts` لا من `Database['public']['Tables']`.
- ممنوع `as any` في كود الإنتاج. مسموح في tests فقط.
- DTOs الحرجة (Invoice, Payment, Journal) لها Zod schemas في `domain/`.
- Discriminated unions لحالات entity (`status: 'draft' | 'posted' | 'cancelled'`).

## 8. قواعد الاختبارات
- `unit/` للـ pure functions و hooks.
- `integration/` للـ workflows عبر طبقات.
- `security/` لـ RLS و tenant isolation و replay.
- اختبار محاسبي يجب أن يفحص: balance, double-entry, immutability.
- استخدم MSW handlers من `src/test/mocks/handlers.ts`.

## 9. قواعد الـ RTL/A11y
- لا `dir="ltr"` يدويًا إلا لأرقام/أكواد.
- استخدم `start`/`end` بدل `left`/`right`.
- 44px min touch target على mobile.
- Sanitize bidi markers من كل input نصي (utility موجود).

## 10. قواعد الأداء
- Lazy-load كل route عبر `lazyWithRetry`.
- Code split كل تقرير ثقيل.
- لا `useEffect` يعتمد على object/array literals بدون stabilization.
- `useStableCallback` للـ callbacks المُمرّرة لـ memoized children.

## 11. قواعد الـ Logging
- لا `console.log` مباشر في كود الإنتاج.
- استخدم `logErrorSafely`, `getSafeErrorMessage` من `lib/errorHandler`.
- كل طلب edge function يحوي `x-correlation-id` يُولّد بـ `crypto.randomUUID()`.

## 12. قواعد العمليات المالية
- كل posting عبر `financial-engine/journal.service` فقط.
- لا hard-delete لكيان مالي — رولباك عبر credit note / reversal entry.
- `Math.round(value * 100) / 100` لكل حساب مالي.
- التحقق من فترة محاسبية مفتوحة قبل أي posting.

## 13. قواعد المزامنة Offline
- كل عملية في طابور المزامنة لها `client_op_id` (UUID).
- العمليات المالية تستخدم idempotency key = `client_op_id`.
- Server-wins افتراضيًا، التعارضات تُسجّل في `sync_conflicts`.

## 14. مراجعة الكود
PR يُرفض إذا:
- ملف > 500 سطر بدون مبرر.
- `supabase.from()` في UI.
- `as any` في كود إنتاج.
- migration بدون RLS على جدول جديد.
- edge function بدون CORS/Zod/JWT.
- console.log باقٍ.
