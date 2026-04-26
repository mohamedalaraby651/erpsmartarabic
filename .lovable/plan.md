# صفحة Dev/Debug للـ Prefetch والـ Chunk Performance

## الهدف
صفحة داخلية (`/dev/prefetch`) تكشف:
1. **سجل حي**: كل route/group تم prefetch لها مع المصدر (hover / idle / boot / sidebar-open / mobile-drawer) والوقت والمدة.
2. **مقارنة قبل/بعد التقسيم**: قياس فعلي لزمن تحميل سيناريوهات (sales-core، sales-ops، mobile drawer) مع وبدون prefetch مسبق.
3. **حالة الـ chunks**: ما هو محمَّل في الذاكرة حالياً، وأي مجموعات مكتملة.

## الملفات الجديدة

### 1. `src/lib/prefetchTelemetry.ts` (جديد)
سجل ذاكرة (in-memory) خفيف يلتقط أحداث prefetch:
- `recordPrefetchEvent({ routeName, group, source, startedAt, durationMs, status, fromCache })`
- `getPrefetchEvents()` / `clearEvents()` / `subscribe(callback)` لتحديث UI لحظياً
- يحفظ آخر 200 حدث فقط (حلقة دائرية) لتجنب تسريب الذاكرة
- يُفعَّل فقط عندما `import.meta.env.DEV` أو عندما يضع المستخدم `localStorage.setItem('debug:prefetch','1')`

### 2. `src/lib/prefetch.ts` (تعديل)
حقن نقاط القياس داخل `prefetchRoute` و`prefetchGroup`:
- قبل `importFn()` → `performance.now()` كبداية
- بعد resolve → حساب المدة وإرسالها لـ `recordPrefetchEvent`
- إضافة وسم `fromCache: true` عندما يُرجع المسار مبكراً بسبب `prefetchedGroups.has(group)`
- لا تأثير على المنطق الإنتاجي — مجرد Hook اختياري

### 3. `src/pages/dev/PrefetchDebugPage.tsx` (جديد)
صفحة بثلاثة أقسام:

**أ) جدول الأحداث الحي** (يتحدّث عبر `subscribe`)
| الوقت | Route | Group | المصدر | المدة (ms) | من الـ Cache؟ |

**ب) مقاييس السيناريوهات** — أزرار تفاعلية:
- **Cold Sales-Core**: مسح `prefetchedRoutes/Groups` ثم قياس `import('@/pages/invoices/InvoicesPage')` مباشرة
- **Warm Sales-Core**: استدعاء `prefetchGroup('sales-core')` ثم قياس الاستيراد التالي (يجب أن يقترب من 0ms)
- **Sales-Ops via Affinity**: قياس الفرق عند فتح sales-core (مع تفعيل affinity) ثم الانتقال لـ sales-ops
- **Mobile Drawer Open**: محاكاة فتح القائمة الجانبية للموبايل ومراقبة ما يتم warm-up

كل سيناريو يعرض:
```
قبل التقسيم: ~XXX ms   بعد التقسيم/Prefetch: ~Y ms   التحسن: NN%
```

**ج) حالة الـ Chunks الحالية**
- قائمة `prefetchedGroups` و`prefetchedRoutes` كـ badges
- زر "Reset" لمسح الحالة وإعادة الاختبار
- شارة الإعدادات التكيفية الحالية (data-saver / balanced / performance) من `getAdaptiveFlags`

### 4. `src/App.tsx` (تعديل)
إضافة المسار داخل layout (محمي بالـ auth):
```tsx
const PrefetchDebugPage = lazy(() => import('./pages/dev/PrefetchDebugPage'));
// ...
<Route path="dev/prefetch" element={<PrefetchDebugPage />} />
```

### 5. (اختياري) `src/components/layout/AppSidebar.tsx`
لن أعدّله. الوصول للصفحة عبر URL مباشر `/dev/prefetch` (صفحة مطوّرين، لا داعي لإظهارها في القائمة).

## نقاط مهمة
- **لا تأثير على الإنتاج**: التليمتري معطّل افتراضياً خارج DEV ما لم يُفعّله المستخدم بـ localStorage.
- **القياس واقعي**: نستخدم `performance.now()` حول الـ dynamic import نفسه، وهو ما يعكس زمن الشبكة + parse + execute.
- **آمن مع الـ cache**: المقاييس "Warm" تُظهر الـ HTTP cache + module cache بشكل صحيح؛ المقاييس "Cold" تُجبر إعادة الاستيراد عبر مسح الـ Sets الداخلية فقط (لا يمكن مسح module cache في المتصفح، لذا "Cold" هنا تعني "Cold للنظام الداخلي" — سأوضح ذلك في النص داخل الصفحة).
- لقياس Cold حقيقي يحتاج المستخدم Hard Reload + DevTools "Disable cache"؛ سأذكر ذلك في الصفحة.

## التحقق بعد التنفيذ
1. الذهاب لـ `/dev/prefetch` بعد تسجيل الدخول
2. تحريك المؤشر على عناصر الشريط الجانبي → يجب أن تظهر الأحداث في الجدول
3. الضغط على "Warm Sales-Core" → الاستيراد التالي يقترب من 0ms
4. التأكد من عدم ظهور أي تحذيرات في console