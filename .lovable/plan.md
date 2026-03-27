

# خطة إعادة بناء نظام التفاعل للموبايل — النسخة المضبوطة

بناءً على المراجعة المعمارية، تم تصحيح 4 افتراضات جوهرية وإعادة تقسيم العمل بشكل واقعي.

---

## التصحيحات المعمارية المطبقة

| الملاحظة | التصحيح |
|----------|---------|
| ليس كل form مناسب لـ wizard | **Adaptive Form Strategy**: طويل → wizard، متوسط → fullscreen single، قصير → inline |
| Collapsible بدون prioritization = cosmetic fix | **Information Hierarchy**: كل detail page يحدد High/Medium/Low priority sections |
| `if (isMobile)` في كل مكان = كارثي | **Render Strategy Pattern**: مكون wrapper واحد `<AdaptiveContainer>` بدل شروط متكررة |
| Sprint sizing مبالغ فيه | **Pilot-first**: CustomerForm + InvoiceDetails فقط في Sprint 1، ثم scaling |

---

## Sprint 1: بناء البنية التحتية + Pilot (الأسبوع الأول)

### 1.1 `AdaptiveContainer` — Render Strategy Pattern
**ملف جديد:** `src/components/mobile/AdaptiveContainer.tsx`

مكون wrapper يستبدل كل `if (isMobile)` المتكرر:
```tsx
<AdaptiveContainer
  desktop={<Dialog>...</Dialog>}
  mobile={<FullScreenForm>...</FullScreenForm>}
/>
```
- يستخدم `useIsMobile()` داخلياً مرة واحدة
- كل form dialog يستدعيه بدل كتابة الشرط

### 1.2 ترقية `FullScreenForm` لدعم الخطوات (اختياري)
**ملف:** `src/components/mobile/FullScreenForm.tsx`

إضافة props اختيارية:
- `steps?: { title: string; content: ReactNode }[]` — إذا مُرر، يعمل كـ wizard
- `activeStep` + `onStepChange` — تحكم خارجي
- Progress bar مرئي + أزرار التالي/السابق في sticky footer
- إذا لم يُمرر `steps` → يعمل كـ single-page fullscreen (الوضع الحالي)

**ملف جديد:** `src/hooks/useFormWizard.ts`
- `currentStep`, `nextStep`, `prevStep`, `goToStep`
- `canProceed` — يربط مع `react-hook-form` `trigger(fieldsForStep)`
- `isFirstStep`, `isLastStep`

### 1.3 Pilot: CustomerFormDialog → Adaptive + Wizard
**ملف:** `src/components/customers/CustomerFormDialog.tsx` (370 سطر، 6 أقسام)

**القرار:** هذا form طويل (20+ حقل) → **wizard مناسب**

على الموبايل — 4 خطوات:
1. **الأساسي**: الاسم، النوع، VIP، التصنيف (الإلزامي فقط)
2. **الاتصال**: هاتف، إيميل، فيسبوك، موقع + المسؤول (إذا شركة)
3. **الموقع**: محافظة، مدينة
4. **المالي**: حد ائتمان، خصم، سداد، ملاحظات، حالة النشاط

على Desktop → يبقى Dialog العادي كما هو (لا تغيير)

التنفيذ: لف الـ form بـ `AdaptiveContainer` — desktop يعرض `Dialog`، mobile يعرض `FullScreenForm` مع `steps`

### 1.4 Pilot: InvoiceDetailsPage → Mobile Layout
**ملف:** `src/pages/invoices/InvoiceDetailsPage.tsx` (632 سطر)

**المشاكل المحددة:**
- سطر 264-298: 7 أزرار action تتراكم على 393px
- سطر 330-383: Stats grid (4 بطاقات) مقبول لكن مكتظ
- سطر 415-449: Table 5 أعمدة — غير قابل للقراءة على الموبايل
- سطر 503-528: Payments table — نفس المشكلة

**التحسينات (mobile فقط عبر AdaptiveContainer):**

**Hero Actions**: تحويل الأزرار لـ:
- زر رئيسي واحد (تسجيل دفعة) ظاهر
- باقي الأزرار في dropdown menu (⋮)

**Stats**: تحويل `grid-cols-2 md:grid-cols-4` إلى `MobileStatsScroll` أفقي (المكون موجود أصلاً)

**Items tab**: 
- **ملف جديد:** `src/components/mobile/MobileDetailItems.tsx`
- يحول Table row إلى Card: اسم المنتج (عنوان) + الكمية × السعر + الإجمالي (بارز)
- يُستخدم للـ read-only tables في كل detail pages

**Payments tab**: نفس التحويل — كل payment كـ Card بدل table row

**Information Hierarchy** (الإضافة المهمة):
- Hero + Stats + Payment Progress = **مرئي دائماً** (High Priority)
- Items tab = **مفتوح افتراضياً** (Medium)
- Activity + Attachments = **مغلق افتراضياً** (Low) — عبر `Collapsible` الموجود

### 1.5 `MobileDetailHeader` — Back Button
**ملف جديد:** `src/components/mobile/MobileDetailHeader.tsx`

Header ثابت لكل detail page على الموبايل:
- زر رجوع (ArrowRight) + عنوان مختصر + إجراء رئيسي واحد
- يحل مشكلة عدم وجود gesture navigation

---

## Sprint 2: Scaling إلى باقي النماذج (الأسبوع الثاني)

### 2.1 تصنيف النماذج حسب الحل المناسب

| النموذج | عدد الحقول | القرار | السبب |
|---------|------------|--------|-------|
| `InvoiceFormDialog` | 10+ حقول + items table | **Wizard (3 خطوات)** | عميل → منتجات → مجاميع |
| `QuotationFormDialog` | مشابه للفاتورة | **Wizard (3 خطوات)** | نفس البنية |
| `SalesOrderFormDialog` | مشابه | **Wizard (3 خطوات)** | نفس البنية |
| `PurchaseOrderFormDialog` | مشابه | **Wizard (3 خطوات)** | نفس البنية |
| `ProductFormDialog` | ~15 حقل + tabs | **Wizard (3 خطوات)** | أساسي → تسعير → مخزون |
| `SupplierFormDialog` | ~12 حقل | **FullScreen single** | أقل تعقيداً من العميل |
| `EmployeeFormDialog` | ~10 حقل | **FullScreen single** | ليس wizard — flow بسيط |
| `ExpenseFormDialog` | 7 حقول | **FullScreen single** | قصير — wizard = friction |
| `PaymentFormDialog` | 8 حقول | **FullScreen single** | قصير — wizard = friction |

**القاعدة:** wizard فقط إذا الحقول > 12 أو يوجد items table

### 2.2 تطبيق على InvoiceFormDialog
خطوات الـ wizard:
1. العميل + طريقة الدفع + تاريخ الاستحقاق
2. المنتجات (InvoiceItemsTable — يعمل أصلاً responsive)
3. المجاميع + الملاحظات

### 2.3 تطبيق على باقي النماذج
كل نموذج يُلف بـ `AdaptiveContainer` — desktop يبقى Dialog، mobile يستخدم FullScreenForm (مع أو بدون steps حسب التصنيف أعلاه)

---

## Sprint 3: باقي Detail Pages + Navigation (الأسبوع الثالث)

### 3.1 تطبيق نمط InvoiceDetails على:
- `CustomerDetailsPage.tsx` — الأكثر تعقيداً (13 tab): Hero مكثف + horizontal tabs + MobileStatsScroll
- `ProductDetailsPage.tsx` — Stats + variants table → cards
- `QuotationDetailsPage.tsx`, `SalesOrderDetailsPage.tsx`, `PurchaseOrderDetailsPage.tsx` — نفس نمط Invoice

### 3.2 Scroll Restoration
**ملف جديد:** `src/hooks/useScrollRestoration.ts`
- يحفظ scroll position في `sessionStorage` عند مغادرة صفحة قائمة
- يستعيدها عند Back navigation
- يُدمج في كل صفحات القوائم

### 3.3 تفعيل PageTransition
`PageTransition` موجود لكن **غير مستخدم**. تطبيقه في `AppLayout.tsx` حول `<Outlet>` مع `direction="fade"`.

---

## Sprint 4: Polish + Consistency (3 أيام)

### 4.1 Touch Target Standardization
مراجعة أزرار الإجراءات في detail pages — كل زر تفاعلي يحصل على `min-h-11 min-w-11` (44px) على الموبايل

### 4.2 Hover → Tap
`CustomerGridCard.tsx` و `DataCard.tsx`: الأزرار المخفية بـ `group-hover` تظهر دائماً على الموبايل (1-2 أزرار أساسية)

### 4.3 Offline-Safe (وليس Offline-first)
- Toast واضح عند فشل عملية بسبب عدم الاتصال: "سيتم الحفظ عند استعادة الاتصال"
- Badge في `MobileHeader` يعرض عدد العمليات المعلقة

---

## ملخص الملفات

| الملف | Sprint | نوع التغيير |
|-------|--------|-------------|
| `mobile/AdaptiveContainer.tsx` | 1 | **جديد** — Render Strategy Pattern |
| `mobile/FullScreenForm.tsx` | 1 | ترقية — إضافة steps اختياري |
| `hooks/useFormWizard.ts` | 1 | **جديد** — منطق الخطوات |
| `customers/CustomerFormDialog.tsx` | 1 | لف بـ AdaptiveContainer + wizard |
| `mobile/MobileDetailItems.tsx` | 1 | **جديد** — read-only items cards |
| `mobile/MobileDetailHeader.tsx` | 1 | **جديد** — back button header |
| `invoices/InvoiceDetailsPage.tsx` | 1 | Mobile layout (actions, stats, tables) |
| `invoices/InvoiceFormDialog.tsx` | 2 | AdaptiveContainer + wizard 3 خطوات |
| `quotations/QuotationFormDialog.tsx` | 2 | AdaptiveContainer + wizard |
| `sales-orders/SalesOrderFormDialog.tsx` | 2 | AdaptiveContainer + wizard |
| `purchase-orders/PurchaseOrderFormDialog.tsx` | 2 | AdaptiveContainer + wizard |
| `products/ProductFormDialog.tsx` | 2 | AdaptiveContainer + wizard |
| `suppliers/SupplierFormDialog.tsx` | 2 | AdaptiveContainer + fullscreen single |
| `employees/EmployeeFormDialog.tsx` | 2 | AdaptiveContainer + fullscreen single |
| `expenses/ExpenseFormDialog.tsx` | 2 | AdaptiveContainer + fullscreen single |
| `payments/PaymentFormDialog.tsx` | 2 | AdaptiveContainer + fullscreen single |
| `customers/CustomerDetailsPage.tsx` | 3 | Mobile layout |
| `products/ProductDetailsPage.tsx` | 3 | Mobile layout |
| + 3 detail pages | 3 | نفس النمط |
| `hooks/useScrollRestoration.ts` | 3 | **جديد** |
| `layout/AppLayout.tsx` | 3 | تفعيل PageTransition |
| `layout/MobileHeader.tsx` | 4 | Offline badge |

---

## النتيجة المتوقعة

| المعيار | قبل | بعد |
|---------|------|------|
| النماذج | 4/10 | 9/10 |
| التفاصيل | 5/10 | 8.5/10 |
| التنقل | 7/10 | 9/10 |
| الاتساق | 6/10 | 9/10 |
| **الإجمالي** | **6.5/10** | **8.6/10** |

