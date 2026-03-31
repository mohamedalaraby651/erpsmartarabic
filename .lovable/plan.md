

# تحليل عرض صفحة العميل على الموبايل — المشاكل والتحسينات

---

## المشكلة الرئيسية: تداخل الشريطين السفليين

هذه المشكلة الأهم وسببها واضح تماماً:

```text
┌─────────────────────────┐
│   محتوى الصفحة          │
│                         │
├─────────────────────────┤ ← CustomerBottomNav (z-40, fixed bottom-0)
│ الملخص │ الفواتير │ المزيد │
├─────────────────────────┤ ← MobileBottomNav (z-50, fixed bottom-0) — يغطيه!
│ الرئيسية │ العملاء │ المنتجات│
└─────────────────────────┘
```

**السبب التقني:**
1. `AppLayout.tsx` يعرض `MobileBottomNav` (z-50) دائماً على كل الصفحات
2. `CustomerDetailsPage.tsx` يعرض `CustomerBottomNav` (z-40) فوقه
3. النتيجة: شريط العميل يختبئ **تحت** شريط التطبيق الرئيسي
4. بالإضافة: class `safe-area-pb` في CustomerBottomNav **غير موجود** في CSS (خطأ إملائي — الصحيح `safe-area-bottom`)

**الحل:** إخفاء شريط التطبيق الرئيسي `MobileBottomNav` عند عرض صفحة تفاصيل العميل، ورفع `CustomerBottomNav` إلى z-50 مع إصلاح safe-area class.

---

## مشاكل إضافية مكتشفة

### 1. Spacer غير كافٍ
سطر 241: `<div className="h-16" />` — مسافة 64px فقط، لكن مع شريطين (كل واحد h-14 = 56px) المحتوى السفلي مقطوع.

### 2. المدفوعات: Summary Bar غير متجاوب
`CustomerTabPayments.tsx` سطر 72: يستخدم `flex` بدون `flex-wrap` — على شاشات صغيرة النصوص تتراكم أفقياً.

### 3. أزرار الإجراءات في البروفايل صغيرة
`CustomerMobileProfile.tsx` سطر 154-162: أزرار "فاتورة جديدة" و"كشف حساب" بارتفاع `h-10` (40px) وزر "المزيد" `h-10 w-10` — أقل من 44px.

### 4. لا يوجد بحث/فلتر في المدفوعات
تبويب الفواتير يحتوي على بحث + فلتر حالة، لكن تبويب المدفوعات لا يحتوي على أي فلتر.

### 5. عنوان القسم النشط يظهر للتبويبات الأساسية أيضاً
`mobileTabLabels` لا يحتوي على `financial` أو `financials` أو `payments-tab`، لكن المنطق `mobileTabLabels[mobileTab] &&` يجعله يختفي لها — وهو سلوك صحيح لكن غير واضح.

---

## خطة التنفيذ

### الخطوة 1: إصلاح تداخل الشريطين (المشكلة الرئيسية)
**الملفات:** `AppLayout.tsx`, `CustomerBottomNav.tsx`, `CustomerDetailsPage.tsx`

- في `AppLayout.tsx`: إخفاء `MobileBottomNav` عندما يكون المسار `/customers/:id` (صفحة تفاصيل العميل)
- في `CustomerBottomNav.tsx`: رفع z-index إلى `z-50`، إصلاح `safe-area-pb` → `safe-area-bottom-compact`
- في `CustomerDetailsPage.tsx`: تعديل spacer من `h-16` إلى `h-[72px]` لضمان عدم قطع المحتوى

### الخطوة 2: تحسين أحجام اللمس المتبقية
**الملفات:** `CustomerMobileProfile.tsx`

- أزرار "فاتورة جديدة" و"كشف حساب" → `min-h-11`
- زر "المزيد" → `min-h-11 min-w-11`

### الخطوة 3: تحسين تبويب المدفوعات على الموبايل
**الملفات:** `CustomerTabPayments.tsx`

- Summary Bar → `grid grid-cols-2` على الموبايل مثل الفواتير
- إضافة بحث بسيط (رقم الدفعة) + فلتر طريقة الدفع

### الخطوة 4: تحسينات بصرية طفيفة
- إضافة `pb-safe-area` للـ Sheet في CustomerBottomNav لضمان عدم اختفاء الأزرار خلف home indicator على iPhone

---

## التفاصيل التقنية

### إخفاء الشريط الرئيسي على صفحة العميل:
```typescript
// AppLayout.tsx
const isCustomerDetail = /^\/customers\/[^/]+$/.test(location.pathname);

// في JSX:
{!isCustomerDetail && <MobileBottomNav onMenuOpen={...} />}
```

### إصلاح CustomerBottomNav:
```diff
- <nav className="fixed bottom-0 inset-x-0 z-40 bg-background border-t safe-area-pb">
+ <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/98 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)] safe-area-bottom-compact">
```

هذا يوحّد الشكل مع MobileBottomNav الرئيسي ويصلح الـ safe area.

