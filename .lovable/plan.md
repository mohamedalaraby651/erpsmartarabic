# خطة تحسين الأداء — تشخيص شامل وإصلاحات

## المؤشرات الحالية (من التتبع المباشر)
- **TTI ≈ 3859ms** (الهدف: <2500ms على 4G)
- **JS bundle: 1060KB** عبر 63 ملف، **CSS: 26KB** (الهدف: ≤700KB أولي)
- **3 طلبات `user_roles` متكررة** في كل تسجيل دخول (مرئية في network logs)
- **4 أوزان خط Cairo** يتم تحميلها قبل أول رسم
- صفحة العميل على الموبايل تطلق **~12 استعلاماً متوازياً** فور الفتح

---

## المشاكل المكتشفة (مرتبة بالأثر)

### 1. شبكة وطلبات HTTP (الأثر الأكبر)

| المشكلة | الموقع | التأثير |
|---|---|---|
| `fetchUserRole` يُستدعى مرتين في تشغيل واحد (من `getSession` ومن `INITIAL_SESSION` لـ `onAuthStateChange`) | `src/hooks/useAuth.tsx:129-160` | +1 RTT قبل أي شيء |
| `usePermissions` يستعلم `user_roles` مرة ثالثة بحقول مختلفة | `src/hooks/usePermissions.ts:35` | +1 RTT |
| `MobileDashboard` و`useDashboardData` كلاهما يسجّل query بنفس key `['dashboard-stats']` لكن بشكلين مختلفين، ما يسبب إعادة تنفيذ | `src/components/dashboard/MobileDashboard.tsx:62` و`useDashboardData.ts:39` | عمل مضاعف |
| `useCustomerDetail` على الموبايل: `isMobile` يفعّل كل الفروع → 12 query فوراً (invoices + paginated-invoices + payments + paginated-payments + ...) | `src/hooks/customers/useCustomerDetail.ts:88-167` | يخنق الموبايل |
| `monthlySalesData` يجلب كل فواتير 6 شهور ويُجمّع في JS | `useDashboardData.ts:71-99` | حمل بيانات كبير + CPU |
| `useBusinessInsights.lowStockProducts` يجلب كل المنتجات + كل صفوف `product_stock` ويصفّي client-side | `useBusinessInsights.ts:21-42` | لا يتحمّل أكثر من ~500 منتج |
| `useCustomerAlerts.monthlySales` يجلب 60 يوماً من الفواتير مع join بالعملاء، ثم يبني خريطة في JS | `useCustomerAlerts.ts:103-138` | حمل ثقيل في الخلفية |
| فاتورة العميل مفصولة بين `customer-invoices` (كاملة) و`customer-invoices-paginated` → جلب مرتين لنفس البيانات تقريباً | `useCustomerDetail.ts:90-105` | ضعف الطلبات |

### 2. حجم الحزمة (Bundle)

- **63 chunk** — overhead HTTP/2 ما زال ملحوظاً على الموبايل.
- `recharts`, `jspdf`, `xlsx`, `react-image-crop`, `react-day-picker` كلها مدرجة كـ vendor chunks لكن **بعضها يُحمّل مع الـ entry chunk** عبر استيرادات ثابتة في صفحات eager.
- `Dashboard.tsx` (eager) يستورد 6 widgets مباشرة وكل widget له queries خاصة.
- لا يوجد `vite-imagetools`/WebP — صور الأيقونات والشعار تُقدَّم PNG.

### 3. تشغيلي (Runtime)

- **خط Cairo بـ 4 أوزان** (400/500/600/700) preloaded قبل FCP — كل وزن ~25KB.
- `index.html` يحتوي JSON-LD + scripts مضمّنة + `<style>` كبير → HTML ~16KB.
- `prefetchCommonRoutes()` يبدأ بعد `load` event، لكن الصفحات الشائعة (customers/invoices) ضمن chunk `pages-sales-core` (~250KB) يُنزَّل كاملاً عند أول تنقّل.
- `performanceMonitor.measureWebVitals` يضيف PerformanceObservers + يلوّث الكونسول في DEV (لا أثر في prod).
- Service Worker cleanup يعمل مرة واحدة فقط، سليم.

### 4. قاعدة البيانات (تأثير غير مباشر)

- لا توجد دلائل واضحة على missing indexes في الكود، لكن استعلامات `count(*)` المتكررة (4 في dashboard-stats + سيرفرعدّ في `dashboard-monthly-sales`) ثقيلة على Postgres بدون materialized view مخصص.

---

## الإصلاحات المقترحة (3 مراحل)

### المرحلة 1 — شبكة وطلبات (أعلى عائد، أقل مخاطرة)

1. **إزالة طلب user_roles المكرر**: في `useAuth.tsx`، تجاهل حدث `INITIAL_SESSION` عندما يكون الـ session هو نفس الذي رجع من `getSession()` (مقارنة بالـ `access_token`). يحفظ RTT كامل.
2. **توحيد user_roles في query واحد مشترك**: نقل `fetchUserRole` إلى `useQuery` بـ key ثابت `['user-role', userId]` يستهلكه كل من `useAuth` و`usePermissions` (بدل استعلامين منفصلين).
3. **إنشاء RPC `get_dashboard_overview`** يرجع dashboard-stats + monthly-sales + low-stock-count + cash-flow-ratio في استدعاء واحد، بدل 6+ استعلامات.
4. **تخفيف fan-out في `useCustomerDetail`**: استبدال `isMobile || tab===X` بـ stage-based loading:
   - Stage 1 (فوري): customer + financial-summary
   - Stage 2 (بعد paint): آخر 10 فواتير + 10 دفعات فقط
   - Stage 3 (عند الفتح أو السحب لأسفل): chart-data, credit-notes, quotations, activities, sales-orders
5. **حذف الازدواجية paginated/non-paginated** للفواتير والدفعات: query واحد paginated يُغذّي كل شيء، والإحصاءات تأتي من `financial-summary` RPC.
6. **توحيد `dashboard-stats`** بين Mobile و Desktop (نفس shape) لاستخدام نفس الكاش.

### المرحلة 2 — حزمة (Bundle)

7. تحويل `useBusinessInsights.lowStockProducts` و`useCustomerAlerts.monthlySales` إلى RPCs server-side، ما يسمح بإزالة منطق التجميع من الـ entry chunk.
8. تأجيل `recharts` فعلياً: التأكد أن لا widget في Dashboard eager يستورد مكوّن chart من `recharts` مباشرة (نقل `SalesChartWidget` خلف `LazyOnVisible`).
9. تخفيض أوزان Cairo إلى وزنين فقط (400 + 600) في الـ preload؛ وإضافة `font-display: swap` صراحة.
10. ضغط الأيقونات في `public/icons` إلى WebP وتقديم `<picture>` في الـ manifest references.

### المرحلة 3 — تشغيلي وقاعدة بيانات

11. إضافة materialized view `mv_dashboard_counts` يُحدّث عبر `pg_cron` كل 5 دقائق بدل عدّ مباشر على 4 جداول.
12. تفعيل `vite-imagetools` لمعالجة صور الأصول وقت البناء.
13. تحويل `prefetchCommonRoutes` لاستخدام `requestIdleCallback` بـ timeout=3000ms (بدل setTimeout) لتفادي التنافس مع أول تفاعل.
14. إضافة `Cache-Control: stale-while-revalidate` headers (موثّق فعلياً في vite.config.ts، لكن يلزم التأكد من الاستضافة).

---

## التفاصيل التقنية

```text
الوضع الحالي عند تسجيل دخول مستخدم على موبايل:
─────────────────────────────────────────────────
[0ms]    DOM ready
[~200ms] HTML + Cairo (4 weights, 100KB) + entry chunk (~400KB)
[~800ms] React mount → AuthProvider
[~1100ms] getSession() → user_roles #1 (RTT)
[~1100ms] onAuthStateChange INITIAL_SESSION → user_roles #2 (نفس البيانات!)
[~1300ms] AppLayout → AppSidebar → usePermissions → user_roles #3 (حقول أخرى)
[~1500ms] Dashboard eager mount → 6 widgets × queries متوازية
[~3859ms] TTI

بعد التحسين المتوقع (المرحلة 1):
─────────────────────────────────────────────────
[~1100ms] getSession() → user_roles واحد (مشترك مع usePermissions)
[~1300ms] Dashboard ← get_dashboard_overview RPC واحد
[~2100ms] TTI متوقع
```

ملفات ستتأثر بالمرحلة 1:
- `src/hooks/useAuth.tsx` — منطق dedup للأحداث
- `src/hooks/usePermissions.ts` — استهلاك query الموحّد
- `src/hooks/useDashboardData.ts` + `MobileDashboard.tsx` — RPC موحّد
- `src/hooks/customers/useCustomerDetail.ts` — staged loading
- migration جديدة: `get_dashboard_overview()` SQL function

---

## المُسلَّمات
- المرحلة 1 وحدها يجب أن تنزل TTI تحت **2500ms** على 4G وتُلغي 2-3 طلبات شبكة في كل جلسة.
- المرحلة 2 تخفض الـ entry chunk من ~400KB إلى ~280KB.
- المرحلة 3 تعالج الأداء عند تضخّم البيانات (>5000 منتج/عميل).

أؤكد قبل بدء التنفيذ: **هل أبدأ بالمرحلة 1 فقط (الأكثر أماناً والأعلى عائداً)، أم بالمراحل الثلاث معاً؟**
