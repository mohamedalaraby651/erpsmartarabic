# ربط الفواتير والمرتجعات داخل صفحة العميل

## الهدف
عرض سجل الفواتير والمرتجعات (إشعارات دائنة) مرتبطين مباشرة في صفحة العميل، مع ملخص أرصدة موحّد يربط: الإجمالي ↔ المدفوع ↔ المرتجعات ↔ الصافي المستحق ↔ الرصيد الحالي.

## ما سيتم بناؤه

### 1. مكوّن جديد: `InvoicesReturnsSummary`
ملف: `src/components/customers/details/InvoicesReturnsSummary.tsx`

شريط ملخص متجاوب (4 بطاقات gradient على شبكة 2×2 موبايل / 4 أعمدة ديسكتوب):

| البطاقة | المصدر | الملاحظات |
|---|---|---|
| إجمالي الفواتير | `Σ invoices.total_amount` | عدد الفواتير |
| المدفوع | `Σ invoices.paid_amount` | نسبة السداد |
| المرتجعات | `Σ credit_notes.amount` (status ≠ cancelled) | عدد + نسبة من الإجمالي |
| الصافي المستحق | إجمالي − مدفوع − مرتجعات | يقارن بـ `current_balance` |

- استخدام التوكنز الدلالية (`primary/emerald/amber/destructive`) فقط — بدون ألوان مباشرة.
- شريط تنبيه أصفر إذا اختلف الصافي عن `current_balance` بأكثر من 0.5 ج.م (للإشارة إلى الحاجة لإعادة احتساب الرصيد).
- جميع الحسابات بـ `Math.round(v*100)/100` (معيار الدقة المالية).
- `role="region"` + `aria-label` للقارئات الشاشية.

### 2. دمج الملخص في تبويب الفواتير (ديسكتوب)
ملف: `src/components/customers/tabs/CustomerTabInvoices.tsx`

- استقبال props جديدة: `creditNotes` و`currentBalance`.
- استبدال شريط الملخص الحالي (داخل `CardContent`) بمكوّن `InvoicesReturnsSummary`.
- إضافة قسم «المرتجعات المرتبطة» أسفل قائمة الفواتير، يعرض آخر 3 إشعارات دائنة مع رابط «عرض الكل» يفتح تبويب credit-notes.

### 3. دمج الملخص في عرض الموبايل
ملف: `src/pages/customers/CustomerDetailsPage.tsx` (داخل `MobileCustomerView`)

- تمرير `currentBalance` إلى `CustomerTabInvoices`.
- عرض `InvoicesReturnsSummary` فوق `CustomerTabInvoices` و`CustomerTabCreditNotes` مرة واحدة عند اختيار قسم `invoices`.

### 4. تمرير البيانات من الصفحة
ملف: `src/pages/customers/CustomerDetailsPage.tsx`

في كل من النداءات الديسكتوب والموبايل لـ `CustomerTabInvoices`، تمرير:
```
creditNotes={detail.creditNotes}
currentBalance={detail.currentBalance}
```
(البيانات متوفرة بالفعل في `useCustomerDetail` — لا حاجة لاستعلام جديد).

## التفاصيل التقنية
- لا توجد تغييرات في قاعدة البيانات أو RLS — الاستعلامات قائمة (`useCustomerDetail` يجلب `invoices` و`creditNotes` فعلياً).
- لا تغييرات على edge functions.
- يحترم RTL: استخدام `gap` و`grid` بدون `left/right` صريحة.
- يحترم mobile-first: 44px touch targets محفوظة في الأزرار الموجودة.

## الملفات المتأثرة
- إضافة: `src/components/customers/details/InvoicesReturnsSummary.tsx`
- تعديل: `src/components/customers/tabs/CustomerTabInvoices.tsx` (props + استخدام الملخص + قسم مرتجعات مختصر)
- تعديل: `src/pages/customers/CustomerDetailsPage.tsx` (تمرير props جديدة في موضعين: ديسكتوب + موبايل)
