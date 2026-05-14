# تدقيق الأداء — مايو 2026

تاريخ: 2026-05-14

## 1. ملخص الحالة الحالية

التطبيق مُهيكَل جيداً بمعايير Lovable القياسية. لا توجد كوارث معمارية. الإصلاحات
الموصى بها تدريجية وتركّز على تقليل زمن التحميل البارد (Cold Start) ومراقبة
الأخطاء الصامتة.

### تحسينات موجودة فعلياً (مرجع — لا تعد بناءها)
- Bundle splitting في `vite.config.ts` (vendor-react/query/charts/pdf/excel + 7 مجموعات صفحات).
- `lazyWithRetry` لكل الصفحات + `Suspense` بـ Skeleton.
- Dashboard يعتمد على RPC واحد `get_dashboard_overview` + Materialized View محدّث بـ pg_cron.
- `useSidebarCounts` يستدعي RPC واحد بدل 7.
- `runtimeTelemetry` + Edge Function `log-event` + درع White-Screen.
- لا توجد Realtime subscriptions نشطة.
- Skeleton جزئي للـ KPI/Chart مع إبقاء بقية الواجهة قابلة للتفاعل.

## 2. ما تم تنفيذه في هذه الجولة

### 2.1 Telemetry شامل لأخطاء Query/Mutation
- `App.tsx`: تم إضافة `QueryCache` و `MutationCache` بـ `onError` يبثّ `query_error` / `mutation_error` إلى `runtimeTelemetry`.
- يتجاهل أخطاء 401/403/42501 (المتوقعة، ضوضاء).
- النتيجة: كل فشل في استعلام يصبح مرئياً في DevTools + ringbuffer + Edge logs، حتى لو لم يعرضه المكوّن للمستخدم.

### 2.2 Performance Marks لمراحل الإقلاع
- `src/lib/bootMarks.ts` (جديد): دالة `markPhase()` تسجّل المراحل في Performance API + تبثّ المهمّة منها لـ Telemetry.
- `main.tsx`: يسجّل `js_executed` و `react_mounted`.
- `useDashboardData.ts`: يسجّل `first_rpc_start` و `first_rpc_done`.
- النتيجة: يمكن قياس "كم استغرق الإقلاع البارد فعلاً" دون فتح DevTools — يأتي تلقائياً من حقل المستخدمين.

### 2.3 Modulepreload للـ vendor chunks الحرجة
- `vite.config.ts`: plugin جديد `criticalChunkPreloadPlugin` يحقن `<link rel="modulepreload">` في `index.html` لـ `vendor-react`, `vendor-supabase`, `vendor-query`.
- النتيجة: المتصفح يبدأ تنزيل هذه الـ chunks بالتوازي مع `main.tsx` بدل الانتظار لتحليله — توفير جولة شبكة كاملة (typically 100–400ms على 4G).

## 3. توصيات للجولات القادمة (بالأولوية)

### عالي الأولوية
1. **مراقبة Telemetry لأسبوع** ثم استخراج أبطأ الاستعلامات الفعلية:
   ```sql
   select event_message, postgres_logs.timestamp, parsed.error_severity
   from postgres_logs
   cross join unnest(metadata) m
   cross join unnest(m.parsed) parsed
   where event_message ilike '%duration%'
   order by timestamp desc limit 100;
   ```
2. **فحص أعمدة `tenant_id` غير المفهرسة** — يستحق فهرسة كل عمود يُستخدم في WHERE بشكل دائم. استخدم:
   ```sql
   select schemaname, tablename, attname
   from pg_stats
   where schemaname = 'public' and attname like '%tenant%' and n_distinct > 100;
   ```
3. **مراجعة سياسات RLS** — استبدال أي `auth.uid()` مباشر بـ `(select auth.uid())` لتفعيل Postgres caching (تحسين 10–100x على الجداول الكبيرة).

### متوسط الأولوية
4. **Virtualization للقوائم > 50 صف** — `useVirtualScroll` موجود لكنه لا يُستخدم في كل القوائم. ابدأ بـ `InvoicesPage` و `CustomersPage`.
5. **React.memo** لمكوّن صف الجدول/البطاقة في القوائم الكبيرة + استخدام `useStableCallback` (موجود) داخلها.
6. **مراجعة `useEffect` بدون cleanup** في:
   - `src/hooks/useAlertNotifier.ts` (audio context)
   - `src/hooks/usePushNotifications.ts` (subscription listeners)

### منخفض الأولوية
7. تحويل صور `src/assets/` > 50KB إلى WebP عبر `vite-imagetools` (غير مثبّت).
8. التأكد أن `og-image.jpg` متاح على الدومين (مذكور في `<head>`).
9. لوحة "آخر الأخطاء" داخل `/admin/activity-log` لقراءة Edge logs مباشرة.

## 4. كيف تقرأ Telemetry بعد النشر

افتح DevTools Console:
```js
JSON.parse(localStorage.getItem('lvbl:runtime-events:v1'))
```

أو في Lovable Cloud → Functions → `log-event` → Logs، ابحث عن:
- `query_error` — استعلامات فاشلة
- `perf_mark` — مراحل الإقلاع وأزمنتها (deltaSinceStart)
- `slow_query` — استعلامات RPC تتجاوز SLA (للاستخدام المستقبلي)

## 5. أدوات تشخيصية يمكن تشغيلها يدوياً

- `supabase--linter` — أمان وفهرسة DB.
- `supabase--analytics_query` على `postgres_logs` لاستخراج أبطأ الاستعلامات.
- `browser--performance_profile` على الصفحات الثقيلة.
- `browser--start_profiling` ثم تنقل، ثم `browser--stop_profiling` لمعرفة أبطأ الدوال.

## 6. الخلاصة

- 3 تحسينات شُحنت في هذه الجولة (Telemetry + Boot Marks + Modulepreload).
- الأثر المتوقّع على Cold Start: **−100 إلى −400ms** (modulepreload).
- الأثر المتوقّع على تشخيص الأعطال: **+100% رؤية** للأخطاء الصامتة.
- المهام المتبقية موثّقة وموزّعة بالأولوية.
