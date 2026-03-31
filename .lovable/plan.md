

# تقرير المشاكل العامة — العرض والمعاينة وسرعة الاستجابة

---

## المشاكل المكتشفة

### 1. ملف `Index.tsx` ميت ويسبب تشويش (أولوية منخفضة)
- `src/pages/Index.tsx` (370 سطر) يحتوي على Dashboard كامل مع استعلامات Supabase مباشرة ورسوم بيانية Recharts
- لا يُستخدم في `App.tsx` — الملف المستخدم فعلياً هو `Dashboard.tsx`
- يسبب تضخم في حجم المشروع وتشويش للمطور
- **الحل:** حذف `src/pages/Index.tsx`

### 2. استعلامات متوازية ثقيلة عند التحميل الأول (أولوية عالية)
عند فتح لوحة التحكم، يتم إطلاق عدد كبير من الاستعلامات في نفس الوقت:

| المصدر | عدد الاستعلامات |
|---|---|
| `useDashboardData` | 4 (stats + monthly sales + tasks + invoices) |
| `useBusinessInsights` → `useCustomerAlerts` | 2 (customers + overdue invoices) |
| `useBusinessInsights` مباشرة | 1 (low stock products + stock) |
| `useSidebarCounts` (في MobileDrawer) | 7 استعلامات متوازية |
| `useDashboardSettings` | 1 |
| `useUserPreferences` | 1 |
| `useAuth` → `fetchUserRole` | 1 |
| `useTenant` | 1+ |

**المجموع: ~18 استعلام** عند أول تحميل. هذا يضغط على الاتصال ويبطئ التحميل خاصة على الموبايل.

**الحل:**
- تأخير `useSidebarCounts` حتى يفتح المستخدم الـ Drawer فعلياً (لا حاجة لجلبها مسبقاً على الموبايل)
- تأخير `useBusinessInsights` حتى اكتمال تحميل Dashboard الأساسي
- زيادة `staleTime` لـ `useSidebarCounts` من 10 ثوانٍ إلى 60 ثانية وتقليل `refetchInterval` من 30 ثانية إلى 120 ثانية

### 3. `MobileHeader` — تشغيل `setInterval` كل 5 ثوانٍ بلا حاجة (أولوية متوسطة)
- السطر 37: `setInterval(checkPending, 5000)` يفحص `localStorage` للعمليات المعلقة offline كل 5 ثوانٍ
- هذا يسبب re-render غير ضروري كل 5 ثوانٍ حتى لو لم يكن هناك عمليات معلقة
- **الحل:** استخدام `storage` event listener بدل polling، أو زيادة الفترة إلى 30 ثانية وإضافة شرط لعدم التحديث إذا لم يتغير العدد

### 4. `useScrollRestoration` يكتب إلى `sessionStorage` على كل scroll event (أولوية متوسطة)
- السطر 24-28: `handleScroll` يكتب `window.scrollY` في كل حدث scroll بدون throttle
- هذا يسبب كتابة مكثفة لـ sessionStorage أثناء التمرير
- **الحل:** إضافة throttle (مثلاً كل 200ms)

### 5. `backdrop-blur` مكثف يبطئ العرض على أجهزة ضعيفة (أولوية متوسطة)
- 74 استخدام لـ `backdrop-blur` في 12 ملف
- `backdrop-blur-xl` على MobileHeader + MobileBottomNav + FABMenu overlay يعني 3 طبقات blur ثابتة على الشاشة
- على أجهزة Android ضعيفة/متوسطة، هذا يسبب بطء ملحوظ في التمرير (jank)
- **الحل:** تقليل `backdrop-blur-xl` إلى `backdrop-blur-sm` على MobileHeader و MobileBottomNav، وإزالة blur من العناصر الثابتة غير الضرورية

### 6. Google Fonts يُحمّل عبر `@import` في CSS (أولوية عالية)
- السطر 1 في `index.css`: `@import url('https://fonts.googleapis.com/css2?family=Cairo:...')` 
- هذا يمنع عرض أي محتوى (render-blocking) حتى يكتمل تحميل الخط
- **الحل:** نقل تحميل الخط إلى `<link rel="preconnect">` + `<link rel="stylesheet">` في `index.html` مع `display=swap`

### 7. `AppInitSkeleton` يعرض حتى بعد إتمام Auth (أولوية متوسطة)
- في `AppLayout.tsx` سطر 66-68: `isHydrated` state يبدأ بـ `false` ويُعرض `AppInitSkeleton` حتى بعد اكتمال auth
- هذا يضيف frame إضافي من skeleton قبل عرض المحتوى الفعلي
- **الحل:** إزالة `isHydrated` gate — الـ auth loading وحده كافٍ

### 8. `PageTransition` يعيد تشغيل الأنيميشن عند كل تغيير route (أولوية منخفضة)
- `key={location.pathname}` على `PageTransition` يُعيد mount المكون بالكامل عند كل تنقل
- مع `Suspense` هذا يعني: unmount → skeleton → mount → animate
- على الموبايل هذا يسبب وميض لحظي
- **الحل:** إزالة `key` prop من `PageTransition` — التنقل بين routes سيُعيد mount `Outlet` تلقائياً

### 9. `prefetchCommonRoutes` يحمّل 5 صفحات فوراً بعد التحميل (أولوية متوسطة)
- يحمّل Dashboard + Customers + Products + Invoices + Settings بعد `load` event
- على اتصال بطيء هذا يتنافس مع الاستعلامات الحقيقية
- **الحل:** تقليل إلى صفحتين فقط (dashboard, customers) وتأخير الباقي عند hover

---

## ملخص الإجراءات

| # | الملف | الإصلاح |
|---|---|---|
| 1 | `src/pages/Index.tsx` | حذف الملف الميت |
| 2 | `src/components/layout/MobileDrawer.tsx` | تأخير `useSidebarCounts` حتى فتح الـ Drawer |
| 3 | `src/hooks/useSidebarCounts.ts` | زيادة `staleTime` إلى 60s و `refetchInterval` إلى 120s |
| 4 | `src/components/layout/MobileHeader.tsx` | استبدال polling كل 5s بـ event listener أو 30s |
| 5 | `src/hooks/useScrollRestoration.ts` | إضافة throttle 200ms |
| 6 | `index.html` + `src/index.css` | نقل Google Font من CSS @import إلى HTML link |
| 7 | `src/components/layout/AppLayout.tsx` | إزالة `isHydrated` gate |
| 8 | `src/components/layout/AppLayout.tsx` | إزالة `key` من PageTransition |
| 9 | `src/components/layout/MobileHeader.tsx` + `MobileBottomNav.tsx` | تخفيف backdrop-blur |
| 10 | `src/lib/prefetch.ts` | تقليل prefetch إلى صفحتين |

