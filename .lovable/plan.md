

# فحص صفحة العميل على الموبايل — النتائج والتحسينات المطلوبة

---

## ما تم إصلاحه سابقاً وأصبح سليماً ✅

| العنصر | الحالة |
|---|---|
| إخفاء الشريط الرئيسي على صفحة تفاصيل العميل (AppLayout) | ✅ |
| CustomerBottomNav: z-50 + backdrop-blur + safe-area-bottom-compact | ✅ |
| أزرار التنقل (السابق/التالي) min-h-11 | ✅ |
| أزرار الإجراءات (فاتورة/كشف/المزيد) min-h-11 | ✅ |
| أزرار الاتصال والواتساب min-h-11 | ✅ |
| بديل "إضافة رقم هاتف" عند عدم وجود هاتف | ✅ |
| Summary Bar في المدفوعات: grid grid-cols-2 | ✅ |
| Summary Bar في الفواتير: grid grid-cols-2 sm:flex | ✅ |
| فلاتر الفواتير: flex-col على الموبايل | ✅ |
| Pagination buttons: min-h-11 | ✅ |
| عنوان القسم النشط فوق المحتوى | ✅ |
| المرفقات في moreGroups | ✅ |
| TabSkeleton بدل spinner | ✅ |
| Spacer h-[72px] | ✅ |

---

## مشاكل مكتشفة تحتاج إصلاح 🐛

### 1. FABMenu يتداخل مع CustomerBottomNav
`FABMenu` في `AppLayout.tsx` (سطر 120) يُعرض **دائماً** على الموبايل — بما في ذلك صفحة تفاصيل العميل. موقعه `bottom-[68px]` مصمم ليكون فوق `MobileBottomNav`، لكن على صفحة العميل يظهر فوق `CustomerBottomNav` بشكل غير منسجم. والأسوأ أن context يكون `customers` فيعرض أزرار "عميل جديد" و"فاتورة للعميل" — وهي غير مفيدة داخل صفحة عميل محدد.

**الإصلاح:** إخفاء `FABMenu` على صفحة تفاصيل العميل (مثل ما فعلنا مع `MobileBottomNav`). الإجراءات السريعة موجودة بالفعل في Sheet "إجراءات سريعة" داخل `CustomerMobileProfile`.

### 2. MobileHeader يظهر مع MobileDetailHeader — تكرار
`AppLayout.tsx` يعرض `MobileHeader` (شريط التطبيق العلوي) دائماً. وفي نفس الوقت `CustomerDetailsPage` يعرض `MobileDetailHeader` (شريط علوي خاص بالعميل مع زر رجوع). النتيجة: **شريطان علويان** — الأول عام والثاني خاص. هذا يأكل مساحة ثمينة على الموبايل.

**الإصلاح:** إخفاء `MobileHeader` على صفحة تفاصيل العميل (بنفس شرط `isCustomerDetail`).

### 3. `MobileDetailHeader` بدون sticky حقيقي
الـ header يستخدم `sticky top-0 z-20` لكنه داخل `<main className="p-3">` — أي أن `p-3` يضيف padding حوله. وبسبب `-mx-4 -mt-4` يحاول التعويض لكن إذا كان parent padding هو `p-3` وليس `p-4`، فالـ offset سيكون خاطئاً بـ 4px.

**الإصلاح:** تغيير `-mx-4 -mt-4` إلى `-mx-3 -mt-3` لتتوافق مع `p-3` في AppLayout.

### 4. زر "سداد" في الفواتير صغير جداً على الموبايل
`CustomerTabInvoices.tsx` سطر 173-180: زر "سداد" بجانب كل فاتورة غير مدفوعة هو `h-7` (28px) — **أقل بكثير من 44px**. هذا يجعله صعب الضغط على الموبايل.

**الإصلاح:** تكبير إلى `min-h-9` مع padding أوسع على الموبايل.

### 5. CardHeader في الفواتير والمدفوعات: العنوان والزر يتراكمان
`CardHeader className="flex flex-row items-center justify-between"` — على شاشات 375px، العنوان "سجل فواتير العميل (45)" مع زر "فاتورة جديدة" يتراكمان. نفس المشكلة في المدفوعات.

**الإصلاح:** `flex flex-col sm:flex-row gap-2` لجعل العنوان والزر عموديين على الموبايل.

### 6. بيانات الفاتورة/الدفعة: نصوص تتراكم
سطر 186-206 في Invoices و 106-129 في Payments: التفاصيل (تاريخ + استحقاق + مدفوع + متبقي) تُعرض بـ `flex-wrap` لكن بدون تباعد رأسي كافٍ — على شاشات صغيرة تتراكم فوق بعض.

**الإصلاح:** إضافة `gap-y-1` مع `gap-x-3`.

### 7. `useMemo` يُستخدم بشكل خاطئ لإعادة ضبط الصفحة
`CustomerTabInvoices.tsx` سطر 71: `useMemo(() => setPage(1), [statusFilter, searchQuery])` — استخدام `useMemo` لتنفيذ side effect (setState) **مخالف لقواعد React**. يجب أن يكون `useEffect`.

**الإصلاح:** تحويل إلى `useEffect`.

### 8. لا يوجد `creditLimit` و `creditUsagePercent` في MobileProfile
`CustomerMobileProfile` يستقبل `creditLimit` و `creditUsagePercent` كـ props لكن لا يمررهما إلى `CustomerKPICards` ولا يعرضهما في أي مكان. بينما الـ desktop `HeroHeader` يعرض نسبة استخدام الائتمان.

**الإصلاح:** إضافة بطاقة صغيرة أو badge لنسبة الائتمان تحت KPI Cards عند وجود حد ائتماني.

---

## ملخص خطة التنفيذ

### الخطوة 1: إصلاح تداخل FAB وتكرار Header
**الملف:** `src/components/layout/AppLayout.tsx`
- إخفاء `FABMenu` و `MobileHeader` على صفحة تفاصيل العميل باستخدام شرط `isCustomerDetail`

### الخطوة 2: إصلاح MobileDetailHeader offset
**الملف:** `src/components/mobile/MobileDetailHeader.tsx`
- تغيير `-mx-4 -mt-4 mb-4` إلى `-mx-3 -mt-3 mb-3`

### الخطوة 3: إصلاح useMemo → useEffect
**الملف:** `src/components/customers/tabs/CustomerTabInvoices.tsx`
- تحويل `useMemo(() => setPage(1), [...])` إلى `useEffect`

### الخطوة 4: تحسين أحجام اللمس والتخطيط
**الملفات:** `CustomerTabInvoices.tsx`, `CustomerTabPayments.tsx`
- زر "سداد" → `min-h-9`
- CardHeader → `flex flex-col sm:flex-row gap-2`
- تفاصيل العناصر → `gap-y-1 gap-x-3`

### الخطوة 5: عرض نسبة الائتمان على الموبايل
**الملف:** `CustomerMobileProfile.tsx`
- إضافة شريط صغير يعرض `creditUsagePercent` تحت KPI Cards عند `creditLimit > 0`

