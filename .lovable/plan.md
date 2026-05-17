## ملاحظة قبل البدء
ذكرت "المرفقات" لكن لم تصلني أي صور. الخطة مبنية على الفحص الحالي للكود + الـ viewport الحالي (393×699). إن أرفقت لقطات سأعدّل القرارات البصرية وفقاً لها.

---

## 1) تقرير الفجوات والأخطاء (Gap & Bug Report)

### A. UI/UX & Responsive
- **Hero hero RTL**: زر إنشاء + AlertsBell + شارات بـ `flex-wrap` ينتج صفّين على 393px (مزدحم).
- **FinancialKPIRow**: 8 بطاقات بـ `grid-cols-2` على الموبايل = 4 صفوف، KPI «هامش الربح» و«DSO» مهمّان جداً لكن مدفونان أسفل الـ scroll.
- **StatsWidget**: ألوان `text-muted-foreground` فقط — بلا تمييز بصري. لا يستخدم `kpi-value` utility المعتمد في Pro Design System v2.
- **TodayPerformanceWidget**: `bg-purple-500/10` و `bg-orange-500/10` انتهاك للنظام (يجب tokens دلالية).
- **WidgetContainer Drag**: على الموبايل drag-and-drop غير قابل للاستخدام (touch target صغير + horizontal scroll محتمل عند drag).
- **WelcomeBanner** ما زال ملفه موجوداً لكنه لم يعد مستورداً (dead code).
- **Empty states**: TasksWidget / RecentInvoicesWidget بدون CTA عند الفراغ (smart empty state policy).
- **AlertsBell** على الموبايل: dropdown w-80 قد يخرج عن الشاشة عند `align="end"`.

### B. Performance & Data
- **3 استعلامات متوازية**: `useDashboardData` يطلق `dashboard-overview` + `dashboard-tasks` + `dashboard-recent-invoices`. الثلاثة لها `staleTime` مختلف وتعيد جلب مستقلّة.
- **useDashboardSettings** يقرأ من DB + localStorage بدون `staleTime` → refetch على كل focus.
- **useDashboardRealtime**: يشترك في 4 جداول؛ كل INSERT يبطل query keys ثقيلة → re-fetch كامل عوضاً عن patch موضعي.
- **SalesChartWidget** lazy ✅ لكن **recharts** يُحمَّل دفعة واحدة (~90KB). يمكن استبداله بـ skeleton أعلى دقّة على الموبايل.
- **CalendarWidget** 224 سطر + **TodayPerformanceWidget** 196 سطر → يدخلان في bundle الرئيسي بدون lazy.
- لا يوجد `prefetch` للوجهات الشائعة (`/invoices`, `/customers`) رغم وجود `lib/prefetch.ts`.

### C. Code Quality & Errors
- **renderWidget** في Dashboard ليس داخل `useCallback` → كل re-render يولّد دوال جديدة لكل widget.
- **handlers في hero** (`() => handleQuickAction(action)`) inline arrow → re-render أزرار في كل تحديث realtime.
- **`navigate` errors**: لا يوجد ErrorBoundary خاص بالـ widgets (إذا فشل CalendarWidget يكسر اللوحة كلها).
- **Console.log/raw errors**: لا فحص شامل، يحتاج audit عبر `rg "console\.(log|error)" src/`.
- **Realtime cleanup**: غير مفحوص — تسرّب محتمل عند تبديل tenants.

---

## 2) خارطة الطريق (Roadmap) — 3 مراحل

### Phase 1 — إصلاحات حرجة + موبايل (الأولوية القصوى)
1. **Hero responsive**: على موبايل: العنوان + الشارات في صف، Bell + زر "+" عائمان أعلى-اليسار بنفس الارتفاع، إخفاء "مرحباً بك" على <sm.
2. **KPI ranking للموبايل**: على <md نعرض 4 KPIs الأساسية فقط (Today, MTD, Overdue, Cash) ضمن أفقي قابل للتمرير-snap، والباقي خلف زر «المزيد».
3. **استبدال ألوان TodayPerformanceWidget** بـ semantic tokens (`bg-accent`, `bg-warning/10`).
4. **حذف WelcomeBanner.tsx** (dead code).
5. **WidgetErrorBoundary**: كل widget داخل boundary منعزل لا يكسر اللوحة.
6. **Smart empty states** لـ TasksWidget و RecentInvoicesWidget مع CTA.
7. **AlertsBell**: `align="end"` + `w-[calc(100vw-1rem)] sm:w-80` لمنع overflow.

### Phase 2 — UX & Feature Completion
1. **StatsWidget redesign**: استخدام `kpi-value` utility + sparkline صغير + tone semantic لكل بطاقة.
2. **Drag-and-drop**: تعطيل DnD على <md، استبداله بزر «ترتيب يدوي» يفتح Sheet لإعادة الترتيب باللمس.
3. **Skeletons احترافية**: shimmer متدرّج للـ chart بدلاً من `bg-muted/30 animate-pulse`.
4. **CommandBar**: إضافة اختصارات حسب الدور + recent items + counts (مثل «الفواتير (12)»).
5. **Tooltips** على كل KPI تشرح كيف تُحسب القيمة (DSO = AR/Credit×90 إلخ).
6. **Sticky KPI bar** عند scroll على الموبايل (شريط مضغوط يعرض Cash + Overdue).

### Phase 3 — تصلّب الأداء (Performance Hardening)
1. **دمج TanStack Queries**: استبدال 3 hooks بـ `useQueries` واحد + cache key موحّد + `placeholderData: keepPreviousData`.
2. **Realtime debounced invalidation**: تجميع invalidations في 500ms window بدل invalidation فوري لكل event.
3. **Lazy-load CalendarWidget + TodayPerformanceWidget** عبر `lazyWithRetry` + Suspense skeleton.
4. **Route prefetch**: عند hover/touch على بطاقة KPI نستدعي `prefetchRoute(href)`.
5. **Memoization audit**: تحويل كل handler إلى `useCallback`, تثبيت kpi cards array بـ `useMemo`, مراجعة dependencies في `useDashboardData`.
6. **Bundle audit**: تشغيل `rollup-plugin-visualizer` على Dashboard chunk والتأكد <150KB gz.
7. **Global error boundary**: إضافة `logErrorSafely` daily-summary + Sentry-like sink (إن وُجد) في `lib/errorHandler.ts`.
8. **E2E test**: Playwright سيناريو يفتح Dashboard على 3 viewports ويتحقق من عدم overflow و KPI render <2s.

---

## 3) خطة تنفيذ Phase 1 (سأبدأ بها فور الموافقة)

```text
Step 1: Hero responsive refactor
  - src/pages/Dashboard.tsx
  - إخفاء welcome subtitle <sm
  - إعادة ترتيب أزرار hero بـ grid على الموبايل

Step 2: Mobile KPI strip
  - src/components/dashboard/FinancialKPIRow.tsx
  - أضف prop `compact` ينشّط 4-cards + horizontal-snap على <md

Step 3: Semantic tokens cleanup
  - src/components/dashboard/TodayPerformanceWidget.tsx (سطور 129, 138)

Step 4: Dead code removal
  - حذف src/components/dashboard/WelcomeBanner.tsx

Step 5: Per-widget error boundary
  - مكوّن جديد: src/components/dashboard/WidgetErrorBoundary.tsx
  - لفّ كل return داخل renderWidget

Step 6: Smart empty states
  - src/components/dashboard/TasksWidget.tsx
  - src/components/dashboard/RecentInvoicesWidget.tsx

Step 7: AlertsBell viewport-safe
  - src/components/dashboard/AlertsBell.tsx (width responsive)
```

### المعايير القابلة للقياس بعد Phase 1
- لا horizontal scroll على 360/375/393/414px.
- LCP الـ Dashboard على 4G simulated ≤ 2.5s.
- لا CLS عند ظهور KPIs (skeletons بنفس الارتفاع).
- كل widget يحتوي على skeleton + error + empty state.

---

هل أبدأ تنفيذ Phase 1 بهذا الترتيب؟ أو تفضّل الترتيب من الموبايل أولاً (Step 1+2+7) ثم الباقي؟
