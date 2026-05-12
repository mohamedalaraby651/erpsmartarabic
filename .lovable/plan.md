# خطة تطوير صفحة العميل للموبيل — تنفيذ متدرج

## نظرة عامة
الخطة مقسّمة إلى **٤ مراحل** مرتّبة حسب الأولوية والأثر. كل مرحلة قائمة بذاتها ويمكن إيقاف التنفيذ بعد أي منها مع نتيجة قابلة للاستخدام.

---

## المرحلة ١ — إصلاحات بنيوية حرجة (Layout & Stacking)

**الهدف:** تقليل الازدحام البصري وتوحيد ترتيب العناصر على الموبيل.

### الخطوة 1.1 — إعادة ترتيب العناصر العلوية
- نقل `CustomerSmartAlerts` + `CustomerHealthBadge` + `CustomerPinnedNote` إلى **داخل** `MobileCustomerView` تحت بطاقة `CustomerMobileProfile` مباشرة (تظل كما هي على الديسكتوب).
- دمج Alerts و Health Badge في صف أفقي واحد قابل للف (wrap) لتوفير المساحة.

### الخطوة 1.2 — تنحيف الهيدرات الثلاث
- إخفاء `CustomerNavStrip` تلقائياً عند التمرير (مثل FAB) وإظهاره فقط في أعلى الصفحة.
- جعل سهم العودة في `SectionHeader` يستخدم `ChevronLeft` بدل النص `←`.

### الخطوة 1.3 — تنظيف الكود الميت
- حذف `<></>` في فرع `mobileSection === 'none'`.
- إزالة `CustomerKPICards` المكرر داخل `CustomerMobileProfile` إذا كان `currentBalance` معروضاً في الهيدر المضغوط (الإبقاء على حد الائتمان فقط).

**الناتج:** صفحة بـ 3 طبقات منطقية فقط: (هيدر/ملف العميل) → (تنبيهات + ملاحظة) → (شريط الأقسام + المحتوى).

---

## المرحلة ٢ — إصلاح التنقل والـ Swipe

**الهدف:** جعل التنقل بين الأقسام طبيعياً بدون مفاجآت.

### الخطوة 2.1 — حصر الـ Swipe على الأقسام الأساسية
- تعديل `navigateBySwipe` ليدور فقط بين `PRIMARY_STRIP_IDS` (وليس + SECONDARY).
- استثناء أحداث اللمس التي تبدأ داخل `[data-h-scroll]`، الـ ScrollArea، أو داخل الجداول/الرسوم.

### الخطوة 2.2 — مؤشر بصري للـ Swipe
- إظهار سهمي تلميح يمين/يسار أسفل `SectionHeader` عند تفعيل قسم (يختفيان بعد أول swipe ناجح أو 3 ثوان).

### الخطوة 2.3 — تنقل الأقسام داخل CompressedHeader
- إضافة زرّي Prev/Next صغيرين داخل `CustomerCompressedHeader` للتنقل بين الأقسام دون التمرير لأعلى.

### الخطوة 2.4 — انتقال متدرج بين IconStrip ↔ CompressedHeader
- استبدال التبديل الفوري بـ `transition-all` + crossfade (200ms) لمنع الوميض.

### الخطوة 2.5 — دعم زر Back الفيزيائي
- استبدال `setSearchParams(..., { replace: true })` بـ `replace: false` فقط عند تغيير القسم (وليس عند مزامنة URL ↔ state)، حتى يتنقل زر Back بين الأقسام طبيعياً.
- إضافة `popstate` listener لتحديث `mobileSection` عند العودة.

### الخطوة 2.6 — إغلاق Sheet تلقائياً
- جعل `CustomerSectionsSheet` يقبل `open/onOpenChange` خارجياً ويُغلق تلقائياً بعد `onPick`.

---

## المرحلة ٣ — Badges + اقتراحات ذكية

**الهدف:** إيصال المعلومة الصحيحة في المكان الصحيح.

### الخطوة 3.1 — Badges حقيقية للأقسام الثانوية
- توسيع `sectionBadges` لتشمل:
  - `aging` — عدد الفواتير في فئة 60+ يوم
  - `communications` — عدد أيام بدون تواصل (إذا > 30)
  - `notes` — عدد الملاحظات المثبّتة
  - `attachments` — عدد المرفقات الجديدة منذ آخر زيارة (اختياري)
- استخدام هذه القيم لحساب `totalBadge` على زر "المزيد" بشكل صحيح.

### الخطوة 3.2 — Badge لقسم sales
- إضافة `staleQuotations` كـ badge على أيقونة `sales` في `IconStrip`.

### الخطوة 3.3 — تحسين سجل الاقتراحات
- إصلاح `useSuggestionHistory` لتسجيل الحدث الأول (إزالة skip في `initRef`) مع عتبة "تغير معنوي":
  - فرق رصيد > 1 ج.م
  - تغير عدد الفواتير المتأخرة
  - تغير `last_communication_at` فعلياً
- تخزين السجل في `localStorage` (TTL 7 أيام) بدلاً من `sessionStorage` لاستمرارية أطول.

### الخطوة 3.4 — اقتراحات حسّاسة للسياق
- إخفاء "اقتراحات ذكية" عند `customer.is_active === false` وعرض رسالة "العميل غير نشط — لا توجد إجراءات مقترحة" بدلاً منها.

---

## المرحلة ٤ — تحسينات لمسة أخيرة (Polish)

**الهدف:** اللمسة الاحترافية والـ Micro-interactions.

### الخطوة 4.1 — Pull-to-Refresh
- استخدام `usePullToRefresh` الموجود لاستدعاء `queryClient.invalidateQueries(['customer', id])` + إعادة جلب الفواتير/الدفعات.

### الخطوة 4.2 — Skeleton عند تبديل الأقسام
- التأكد من أن `Suspense fallback={<TabSkeleton />}` يعمل بشكل ملحوظ (أحياناً يُتخطى بسبب الـ cache) — إضافة حدّ أدنى ارتفاع لمنع القفز.

### الخطوة 4.3 — تلميح Long-press على VIP
- إضافة `animate-pulse` لمرة واحدة لشارة VIP لمستخدم جديد (تخزين flag في `localStorage`)، مع tooltip صغير "اضغط مطولاً للتغيير".

### الخطوة 4.4 — إجراءات سياقية على الفواتير
- Long-press على بطاقة فاتورة → bottom sheet به: تسديد سريع / طباعة / مشاركة واتساب / تحويل لإشعار دائن.

### الخطوة 4.5 — FAB ذكي
- استبدال `window.scrollY` بـ `IntersectionObserver` على عنصر "نهاية المحتوى" — يضمن العمل مع أي container قابل للتمرير.
- إضافة `pb-safe` (env(safe-area-inset-bottom)) للـ FAB والـ bottom sheets لتفادي تداخل مع iPhone notch.

---

## تفاصيل تقنية للمطوّر

### الملفات التي ستُعدَّل

```text
src/pages/customers/CustomerDetailsPage.tsx          — مراحل 1, 2, 3, 4
src/components/customers/mobile/
  ├─ CustomerMobileProfile.tsx                       — مرحلة 1.3, 4.3
  ├─ CustomerIconStrip.tsx                           — مرحلة 3.2
  ├─ CustomerCompressedHeader.tsx                    — مرحلة 2.3, 2.4
  ├─ CustomerSectionsSheet.tsx                       — مرحلة 2.6, 3.1
  ├─ CustomerNavStrip.tsx                            — مرحلة 1.2 (auto-hide)
  ├─ CustomerMobileFAB.tsx                           — مرحلة 4.5
  └─ CustomerQuickSuggestions.tsx                    — مرحلة 3.4
src/hooks/customers/
  ├─ useLastVisitedSection.ts                        — مرحلة 2.5 (popstate)
  └─ useSuggestionHistory.ts                         — مرحلة 3.3 (localStorage + threshold)
```

### ملفات جديدة

```text
src/components/customers/mobile/CustomerSwipeHint.tsx     — مرحلة 2.2
src/hooks/customers/useCustomerPullToRefresh.ts           — مرحلة 4.1 (wrapper بسيط)
```

### قواعد البيانات
لا تغييرات في الـ schema. جميع التحسينات Frontend-only.

### الاختبارات (E2E)
- تحديث `e2e/mobile-journey.spec.ts` لتغطية: swipe بين أقسام أساسية، badge على More، إغلاق Sheet بعد الاختيار، استرجاع آخر قسم، popstate.

---

## معايير القبول لكل مرحلة

| المرحلة | معيار النجاح |
|---|---|
| 1 | لا يوجد عنصر خارج بطاقة الملف يَزِيد ارتفاع رأس الصفحة عن 280px قبل المحتوى |
| 2 | Swipe لا يُفعَّل أثناء تمرير الجداول؛ زر Back المتصفح ينقل بين الأقسام |
| 3 | Badge "المزيد" يعكس مجموع الإشارات الفعلية؛ سجل الاقتراحات يحوي ≥1 إدخال بعد أي تغير معنوي |
| 4 | Pull-to-Refresh يعيد جلب البيانات بنجاح؛ FAB يختفي عند التمرير لأسفل بصرف النظر عن نوع container |

---

## التوصية
البدء بالمرحلتين **١ و ٢** فقط في تنفيذ واحد (تحلّان أكبر مشاكل الاستخدام)، ثم مراجعة مع المستخدم قبل المتابعة للمرحلتين ٣ و ٤.
