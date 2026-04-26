# تقسيم حزمة pages-sales لتحسين أداء الموبايل

## الوضع الحالي

حزمة `pages-sales` تحتوي على 8 صفحات بحجم **524KB** — وهي أكبر حزمة في النظام:

| المجموعة | الصفحات | الأسطر التقريبية |
|---|---|---|
| **العملاء + الفواتير + المدفوعات** | customers, invoices, payments, credit-notes | ~2,330 سطر |
| **الوثائق التشغيلية** | quotations, sales-orders, collections, pricing | ~2,378 سطر |

المشكلة: المستخدم في أول زيارة لأي صفحة من هذه الـ 8 يحمّل 524KB دفعة واحدة، مما يبطئ Time-to-Interactive على شبكات 3G/4G.

## الاستراتيجية المقترحة

### تقسيم إلى مجموعتين متوازنتين بناءً على نمط الاستخدام الحقيقي

**1. `pages-sales-core` (~260KB متوقع)** — المسار اليومي الأكثر استخداماً
- `customers/` — العملاء (الأكثر زيارة)
- `invoices/` — الفواتير
- `payments/` — المدفوعات
- `credit-notes/` — إشعارات دائنة

**لماذا معاً؟** هذه الصفحات تشترك في:
- نفس مكونات العميل (`CustomerCombobox`, `CustomerSearchSelect`)
- نفس منطق المدفوعات والأرصدة
- المستخدم عادةً يفتح فاتورة → دفعة → عميل في نفس الجلسة

**2. `pages-sales-ops` (~260KB متوقع)** — العمليات والتسعير
- `quotations/` — عروض الأسعار
- `sales-orders/` — أوامر البيع
- `collections/` — لوحة التحصيل
- `pricing/` — قوائم الأسعار

**لماذا معاً؟** 
- Quotation → Sales Order → Invoice (تدفق متسلسل، لكن الـ Invoice في المجموعة الأخرى عبر prefetch)
- Collections و Pricing عمليات إدارية أقل تكراراً

## التغييرات المطلوبة

### 1. `vite.config.ts`
استبدال السطر الحالي:
```typescript
if (/\/pages\/(customers|invoices|payments|credit-notes|sales-orders|quotations|collections|pricing)\//.test(id)) {
  return 'pages-sales';
}
```

بـ:
```typescript
// المسار اليومي: العملاء والفوترة والمدفوعات
if (/\/pages\/(customers|invoices|payments|credit-notes)\//.test(id)) {
  return 'pages-sales-core';
}
// العمليات: عروض، أوامر بيع، تحصيل، تسعير
if (/\/pages\/(quotations|sales-orders|collections|pricing)\//.test(id)) {
  return 'pages-sales-ops';
}
```

### 2. `src/lib/prefetch.ts`
تحديث خريطة المجموعات لتعكس التقسيم الجديد:
- `prefetchGroup('sales-core')` يُحمّل المجموعة الأولى
- `prefetchGroup('sales-ops')` يُحمّل الثانية
- ربط prefetch ذكي: عند فتح Quotation/SO، نقوم بـ prefetch لـ `sales-core` (لأن المستخدم سيحوّل لفاتورة لاحقاً)
- عند فتح Invoice، نقوم بـ prefetch لـ `sales-ops` فقط إذا كان المستخدم في قسم المبيعات

### 3. تحديث Sidebar Section Groups
في `SidebarNavSections.tsx` و `MobileDrawer.tsx`:
- قسم "المبيعات والعملاء" يستدعي `prefetchGroup('sales-core')` عند التوسيع
- إضافة منطق ثانوي: بعد ~500ms من فتح Sidebar، prefetch لـ `sales-ops` بأولوية منخفضة عبر `requestIdleCallback`

## النتائج المتوقعة

| المقياس | قبل | بعد |
|---|---|---|
| أكبر حزمة pages-* | 524KB | ~270KB (-48%) |
| تحميل أولي (مستخدم يفتح Invoice) | 524KB | ~270KB |
| تحميل ثانوي (لو زار quotation) | 0KB إضافي | +260KB (مع prefetch = شفاف) |
| إجمالي الحزم في الموقع | 7 | 8 (+1 فقط) |

**المكسب الفعلي على 4G (1.5MB/s):**
- توفير ~170ms في Time-to-Interactive للمستخدم الذي يفتح فقط الفواتير/العملاء
- Smart prefetch يضمن أن التنقل بين Invoice ↔ Quotation يبقى فورياً (0ms) لأن chunk الثاني يكون محمّلاً مسبقاً عبر hover/expand

## ملاحظات

- لن نزيد عدد طلبات الشبكة الفعلية لأن `prefetchGroup` يستخدم `requestIdleCallback` ولا يتنافس مع المسار الحرج
- التقسيم محافظ — لن نكسر منطق كود مشترك، فقط نعيد توزيع نقاط الدخول
- لن نلمس eager imports (Auth/Layout/Dashboard) ولا الحزم الأخرى (inventory, finance, etc.)
