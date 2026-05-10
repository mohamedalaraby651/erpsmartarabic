# خطة تطوير صفحة تفاصيل العميل على الموبايل

## أولاً: المشاكل المكتشفة (Bugs / UX issues)

| # | المشكلة | الأثر |
|---|---|---|
| 1 | `CustomerSmartAlerts` + `CustomerHealthBadge` + `CustomerPinnedNote` تُعرض **فوق** بطاقة الملف الرئيسية (`CustomerMobileProfile`) → ترتيب غير منطقي وزحام أعلى الشاشة | الهوية البصرية للعميل (الاسم/الرصيد/الإجراءات) تُدفع للأسفل |
| 2 | الشريط اللاصق (`sticky top-0`) في الموبايل يحتوي **الهيدر المضغوط + شريط الأيقونات معاً** → يصل ارتفاعه ~140px ويأكل ثلث الشاشة عند التمرير | فقدان مساحة المحتوى |
| 3 | `CustomerIconStrip` يحوي **11 قسماً** أفقياً → overwhelm + كثير منها نادر الاستخدام (مرفقات/تواصل/أعمار ديون) | صعوبة العثور على المهم |
| 4 | لا يوجد تنقّل **سابق/تالي** بين العملاء على الموبايل (متاح فقط في Hero الديسكتوب) | مستخدم الموبايل مضطر للعودة للقائمة |
| 5 | لا توجد **مؤشرات Swipe** للتنقل بين الأقسام (Tabs gesture) | UX دون مستوى التطبيقات الأصلية |
| 6 | لا يتم **تذكر آخر قسم مفتوح** عند العودة للعميل (يبدأ دائماً من `none` ما لم يُمرَّر ?section في URL) | عناء متكرر |
| 7 | لا توجد **Pull-to-Refresh** في صفحة التفاصيل (موجودة في القائمة فقط) | لا يمكن تحديث الرصيد بسرعة |
| 8 | `CustomerQuickSuggestions` يعرض 3 اقتراحات ثابتة فقط (فواتير/كشف/تذكيرات) ولا يتفاعل مع حالة العميل (مثلاً: لا يقترح "اتصل به" إذا انقطع التواصل ٣٠ يوم) | اقتراحات سطحية |
| 9 | تغيير **VIP** غير متاح على الموبايل (موجود فقط في `CustomerHeroHeader` الديسكتوب) | تكافؤ ميزات ناقص |
| 10 | الانتقال بين الأقسام **فوري بلا انتقال بصري** | يبدو متقطع |
| 11 | على شاشات صغيرة جداً (320px)، `CustomerCompressedHeader` يحوي ٣-٤ أزرار 36×36 + الاسم + الرصيد → احتمال overflow | كسر بصري |
| 12 | لا يوجد **إجراء عائم (FAB)** سريع لإنشاء فاتورة من أي مكان داخل الصفحة | احتكاك مستمر |

## ثانياً: التحسينات المقترحة (مرتبة حسب الأولوية)

### A. إصلاحات بنيوية (أولوية عالية)
1. **إعادة ترتيب الكتل على الموبايل** فقط:
   - بطاقة الملف (`CustomerMobileProfile`) أولاً
   - ثم `CustomerSmartAlerts` (مدمج، مع إخفاء `CustomerHealthBadge` المنفصل أو دمجه كـchip داخل البطاقة)
   - ثم `CustomerPinnedNote` (مطوي افتراضياً إذا كان فارغاً)
   - ثم الشريط اللاصق + المحتوى
2. **تنحيف الشريط اللاصق**: عند ظهور الـCompressed header، إخفاء شريط الأيقونات تلقائياً واستبداله بزر "الأقسام" واحد يفتح Sheet — يوفر ~80px.
3. **تجميع IconStrip**: إبقاء أهم 6 (فواتير، مدفوعات، كشف، تذكيرات، مبيعات، تحليلات) + زر "المزيد" يفتح Sheet بالباقي.

### B. ميزات تنقّل وذاكرة
4. **شريط تنقّل عملاء** صغير في الموبايل (سهم سابق/تالي + اسم العميل التالي) أعلى البطاقة، مرتبط بـ`useCustomerNavigation` الموجود.
5. **تذكر آخر قسم مفتوح** لكل عميل في `sessionStorage` (مفتاح `customer:last-section:<id>`) — يُحمّل تلقائياً عند الفتح إن لم يكن في URL.
6. **Swipe بين الأقسام**: تمرير يميناً/يساراً داخل منطقة المحتوى ينتقل للقسم التالي/السابق في `stripIcons` (مع haptic خفيف).

### C. تفاعلية
7. **Pull-to-Refresh** على المحتوى — يستدعي `detail.refetch` (إن وُجد، وإلا `queryClient.invalidateQueries({ queryKey: ['customer', id] })`).
8. **اقتراحات ذكية ديناميكية** في `CustomerQuickSuggestions`: إضافة قواعد:
   - رصيد متجاوز حد الائتمان → "حصِّل دفعة"
   - بدون نشاط 30+ يوم → "تواصل مع العميل" (واتساب)
   - عرض سعر معلق منذ 7 أيام → "حوّل إلى فاتورة"
9. **زر FAB عائم** أسفل اليمين للإجراء الأكثر استخداماً (فاتورة جديدة) — يختفي عند التمرير لأسفل ويظهر عند التمرير لأعلى.
10. **انتقال محتوى الأقسام** بـ `motion.div` مع `AnimatePresence` (slide + fade خفيف 150ms).

### D. تكافؤ ميزات
11. **تغيير VIP** عبر long-press على badge الـVIP في `CustomerMobileProfile` (يفتح Sheet بقائمة المستويات).
12. **تحسين 320px**: في `CustomerCompressedHeader`، إخفاء زر "اتصال" (يبقى الواتساب) عند `< 360px` لمنع overflow.

## ثالثاً: الملفات المتأثرة

**سيتم تعديلها:**
- `src/pages/customers/CustomerDetailsPage.tsx` — إعادة ترتيب الكتل، Pull-to-Refresh، Swipe handler، تذكر القسم.
- `src/components/customers/mobile/CustomerIconStrip.tsx` — تقليم لـ6 + زر "المزيد".
- `src/components/customers/mobile/CustomerCompressedHeader.tsx` — توافق 320px.
- `src/components/customers/mobile/CustomerQuickSuggestions.tsx` — اقتراحات ديناميكية.
- `src/components/customers/mobile/CustomerMobileProfile.tsx` — long-press على VIP badge.

**ملفات جديدة:**
- `src/components/customers/mobile/CustomerSectionsSheet.tsx` — Sheet "المزيد" للأقسام النادرة.
- `src/components/customers/mobile/CustomerNavStrip.tsx` — شريط سابق/تالي.
- `src/components/customers/mobile/CustomerMobileFAB.tsx` — زر FAB ذكي يختفي/يظهر مع التمرير.
- `src/hooks/customers/useLastVisitedSection.ts` — حفظ/استرجاع آخر قسم.

## رابعاً: تفاصيل تقنية

```text
Layout (mobile, جديد):
┌──────────────────────────┐
│ MobileDetailHeader       │  (موجود)
├──────────────────────────┤
│ CustomerNavStrip ◀ ▶     │  (جديد: عميل سابق/تالي)
├──────────────────────────┤
│ CustomerMobileProfile    │  (موجود)
├──────────────────────────┤
│ SmartAlerts (مدمج)       │  (نقل من الأعلى)
│ PinnedNote (مطوي)        │
├══════════════════════════┤  ← sticky
│ IconStrip (6 + المزيد)   │  (مُقلّم)
├══════════════════════════┤
│ Section content + swipe  │  (مع AnimatePresence)
└──────────────────────────┘
                       (FAB)  ← عائم
```

- **مفتاح التذكر**: `sessionStorage["customer:last-section:" + id]`، يُمسح عند مغادرة الصفحة لأكثر من 30 دقيقة.
- **Swipe threshold**: 60px أفقي + سرعة > 0.3 (نفس قواعد `useSwipeable` المستخدم في المشروع).
- **FAB**: يستخدم `IntersectionObserver` على عنصر "نهاية الصفحة" + scroll direction detection.
- **لا تغييرات في الباك إند ولا الـRLS** — تحسينات واجهة بحتة.

هل توافق على تنفيذ كامل الخطة، أم تفضّل أن أبدأ بقسم محدد فقط (مثلاً: A فقط — الإصلاحات البنيوية)؟
