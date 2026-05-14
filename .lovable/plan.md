# خطة تدقيق وتحسين الأداء والموثوقية

## ما هو موجود فعلياً (لا حاجة لإعادة عمله)
- تقسيم Bundle عبر `manualChunks` في `vite.config.ts` (vendor-react/query/charts/pdf/excel + 7 مجموعات صفحات).
- `lazyWithRetry` لكل الصفحات + `Suspense` بـ skeleton.
- `QueryClient` بإعدادات ذكية (5min stale، عدم retry على 401/403، backoff exponential) + ملف `queryConfig.ts` موحّد.
- Dashboard يعتمد على RPC واحد `get_dashboard_overview` + Materialized View محدّث بـ pg_cron.
- Skeleton جزئي (KPI/Chart فقط) — تم إنجازه في الجولة السابقة.
- `runtimeTelemetry` + Edge Function `log-event` + درع White-Screen في `index.html`.
- Service Worker cleanup, font preloading، 25s shield، CSP صارم.
- لا يوجد Realtime subscriptions نشطة (نقطة قوة).

## النتيجة: لا توجد كوارث معمارية. التركيز على التحسينات المتدرّجة.

---

## المحور 1 — Frontend / React (إعادة التصيير وتسريبات الذاكرة)

### الفحص (يدوي عبر أدوات المتصفح)
1. تشغيل `browser--performance_profile` على `/` و `/customers` و `/invoices` لقياس Long Tasks / DOM nodes / JS heap الفعليّة.
2. تشغيل `browser--start_profiling` ثم تنقل سريع بين 4 صفحات → `browser--stop_profiling` لمعرفة أعلى Self-time.
3. مراقبة JS heap بعد 5 جلسات تنقل: ارتفاع > 30 MB دون رجوع = تسريب.

### التحسينات المرجّحة
- إضافة `React.memo` لمكوّنات القوائم الكبيرة في `CustomersPage` / `InvoicesPage` / `ProductsPage` (صفوف الجدول/البطاقات).
- استخدام `useStableCallback` (موجود) داخل القوائم لمنع إعادة تصيير الـ children عند كل render للأب.
- مراجعة `useEffect` بدون cleanup داخل `src/hooks/useAlertNotifier.ts` و `useAppBadge.ts` و `usePushNotifications.ts` — هذه أنواع مشهورة بالاشتراكات اللي تنسى تُلغى.
- تحويل القوائم الطويلة (> 50 صفاً) إلى `useVirtualScroll` (موجود بالفعل لكن غير مستخدم في كل القوائم) — ابدأ بـ `InvoicesPage`.
- نقل `useState` الثقيلة في `AppLayout` (sidebarCollapsed, mobileMenuOpen) إلى `useReducer` لتقليل re-renders للـ shell كله.

---

## المحور 2 — قاعدة البيانات و RPC (Lovable Cloud)

### الفحص (عبر أدوات Supabase)
1. `supabase--linter` → التقاط فهارس مفقودة، RLS مع `auth.uid()` غير ملفوف في `(select ...)`.
2. `supabase--analytics_query` على `postgres_logs` لاستخراج أبطأ 20 query في آخر 24 ساعة:
   ```sql
   select event_message, parsed.error_severity, postgres_logs.timestamp
   from postgres_logs
   cross join unnest(metadata) as m
   cross join unnest(m.parsed) as parsed
   where event_message ilike '%duration%'
   order by timestamp desc limit 50
   ```
3. مراجعة كل سياسات RLS التي تستخدم `auth.uid()` مباشرة → استبدالها بـ `(select auth.uid())` للسماح للـ Postgres بـ caching النتيجة لكل query (تحسين 10–100x على الجداول الكبيرة).
4. التأكد من وجود فهارس على كل عمود `tenant_id` + الأعمدة الأكثر فلترةً (`customer_id`, `created_at`, `payment_status`).
5. مراجعة دوال `SECURITY DEFINER` للتأكد من `SET search_path = public` (تم في Memory).

### تحسينات محتملة
- تحويل أي استعلام يجلب `count(*)` على جدول كبير إلى Materialized View جديد أو عمود مُحسوب مع trigger.
- ضغط `useSidebarCounts` — لو يستدعي 6+ counts، اجمعهم في RPC واحد مشابه لـ `get_dashboard_overview`.
- مراجعة `useCustomerAlerts` و `useBusinessInsights` (موجود استدعاء RPC في كلٍ) — تأكد من `staleTime` مناسب (`reference` أو `report`).

---

## المحور 3 — Assets و Loading Waterfall

### الفحص
1. `browser--list_network_requests resource_types=all` على أول تحميل → التقاط:
   - حجم index.html
   - حجم vendor-react / vendor-query / vendor-misc
   - عدد الـ chunks المُحمّلة قبل first paint
   - ترتيب تحميل الخطوط
2. مراجعة شلال الشبكة: أي طلب Supabase يبدأ قبل اكتمال bundle = جيد. أي chunk يُحمّل بعد chunk آخر بدلاً من بالتوازي = مشكلة.

### تحسينات
- إضافة `<link rel="modulepreload">` للـ chunks الحرجة (vendor-react, vendor-supabase) في `index.html` بعد البناء.
- التحقق أن خط Cairo يستخدم `font-display: swap` (موجود في الرابط).
- مراجعة الصور في `src/assets/` — تحويل أي PNG > 50KB إلى WebP عبر `vite-imagetools` (غير مثبّت حالياً).
- تأكد أن أيقونات `lucide-react` تُستورد مفردةً (`import { X } from 'lucide-react'`) وليس بالكامل.
- فحص وجود `og-image.jpg` على الدومين (تم الإشارة إليه في `<head>`) لتجنّب 404 يبطئ social previews.

---

## المحور 4 — معالجة الأخطاء و Logging

### ما هو موجود
- `runtimeTelemetry.installGlobalErrorHandlers()` يلتقط `error` + `unhandledrejection`.
- `AppErrorBoundary` + `PageErrorBoundary` + `RouteErrorPage`.
- Edge Function `log-event` + ring buffer في localStorage.
- White-screen shield بعد 25s.

### تحسينات مقترحة
- إضافة `QueryClient` global error handler:
  ```ts
  queryCache: new QueryCache({
    onError: (error, query) => emitTelemetry('query_error', error.message, { queryKey: query.queryKey })
  })
  ```
- إضافة Performance Marks لمراحل التحميل الحرجة (auth init, first RPC, dashboard paint) ودفعها إلى Telemetry.
- إضافة لوحة "آخر الأخطاء" في `/admin/activity-log` لقراءة Edge logs مباشرة بدل مراجعتها يدوياً.
- إضافة Sentry-style breadcrumbs خفيفة (route changes, supabase calls) لتسهيل تتبع الأخطاء الصامتة.

---

## ترتيب التنفيذ المقترح (متدرّج، آمن)

| # | المهمة | الأثر | المخاطرة |
|---|---|---|---|
| 1 | تشغيل `supabase--linter` + إصلاح RLS بـ `(select auth.uid())` | 🔴 عالي | منخفضة |
| 2 | فهرسة الأعمدة الناقصة على tenant_id والأعمدة المفلترة كثيراً | 🔴 عالي | منخفضة |
| 3 | تجميع `useSidebarCounts` في RPC واحد | 🟡 متوسط | منخفضة |
| 4 | إضافة QueryCache onError + breadcrumbs | 🟡 متوسط | لا توجد |
| 5 | Virtualization لقوائم > 50 صف | 🟡 متوسط | متوسطة (يحتاج اختبار) |
| 6 | React.memo + useStableCallback في القوائم الكبيرة | 🟢 منخفض | منخفضة |
| 7 | modulepreload للـ vendors + WebP للصور الكبيرة | 🟢 منخفض | لا توجد |

## تشخيص قبل التنفيذ
سأستخدم بشكل فعلي:
- `supabase--linter` للحصول على قائمة المشاكل الفعلية (لا تخمين).
- `supabase--analytics_query` لاستخراج أبطأ استعلامات حقيقية من logs.
- `browser--performance_profile` + `browser--list_network_requests` لقياس واقع المتصفح وليس افتراضات.

ثم أنفّذ المهام بالترتيب أعلاه، مع تحقّق بصري/شبكي بعد كل مرحلة.

## Output النهائي للمستخدم
- تقرير مختصر بالأرقام: قبل/بعد لكل تحسين (TTI, JS heap, RLS query duration).
- ملف `docs/PERFORMANCE_AUDIT_2026_05.md` يحتوي قائمة كاملة بالنتائج والإصلاحات.
