

# تقرير المشاكل الحالية في قسم العملاء

---

## المشاكل المكتشفة

### 1. الرسوم البيانية لا تستخدم RPC الجديد `get_customer_chart_data`
**الأثر: دقة بيانات مقطوعة + RPC غير مُستخدم**

رغم إنشاء `chartData` في `useCustomerDetail.ts` (سطر 112-122) عبر RPC `get_customer_chart_data`، **لا يتم استخدامه في أي مكان**. الرسوم البيانية الأربعة لا تزال تعتمد على `detail.invoices` و `detail.payments` (المحدودة بـ 500 سجل):

- `CustomerPurchaseChart` — يستقبل `invoices` و `payments` كـ props
- `AgingDonutChart` — يستقبل `invoices` كـ props  
- `CashFlowLineChart` — يستقبل `invoices` و `payments` كـ props
- `TopProductsChart` — يجلب بياناته بنفسه عبر استعلامين مباشرين (بدون حد لكن بدون استخدام RPC)

**في `CustomerDetailsPage.tsx`** (سطر 397-401):
```
<CustomerPurchaseChart invoices={detail.invoices} payments={detail.payments} />
<AgingDonutChart invoices={detail.invoices} />
<CashFlowLineChart invoices={detail.invoices} payments={detail.payments} />
```

**الإصلاح**: تعديل الرسوم البيانية لاستقبال `chartData` من RPC بدل الفواتير الخام.

---

### 2. جلب مزدوج: `findInvoices(500)` + `findInvoicesPaginated` لا يزال موجوداً
**الأثر: طلبات شبكة مضاعفة**

في `useCustomerDetail.ts` (سطور 73-109):
- `findInvoices` يجلب 500 فاتورة (سطر 77)
- `findInvoicesPaginated` يجلب صفحة واحدة (سطر 86)
- نفس المشكلة مع `findPayments` (سطر 96) + `findPaymentsPaginated` (سطر 104)

الفواتير غير المُقسمة تُستخدم في: Hero Header، Smart Alerts، Financial Summary (`invoiceCount`)، والرسوم البيانية. هذا يعني أن إزالتها تتطلب أولاً نقل كل هذه الاعتماديات إلى RPCs.

---

### 3. `TopProductsChart` يجلب بيانات بشكل مستقل بدل استخدام RPC
**الأثر: استعلامان إضافيان غير ضروريين**

في `TopProductsChart.tsx` (سطر 14-31): يستعلم عن `invoices` ثم `invoice_items` بشكل منفصل. RPC `get_customer_chart_data` يُعيد `top_products` جاهزة لكنها لا تُستخدم.

---

### 4. لا يوجد "تحديد الكل" (Select All) في واجهة القائمة
**الأثر: UX ناقص للعمليات الجماعية**

`useBulkSelection` يوفر `toggleSelectAll` و `isAllSelected`، لكن لا يوجد checkbox header في القائمة ولا في شريط الأدوات لتفعيل "تحديد الكل". يجب على المستخدم تحديد كل عميل يدوياً.

---

### 5. لا يوجد `ErrorBoundary` في صفحات العملاء
**الأثر: أي خطأ React يُسقط الصفحة بالكامل**

لا يوجد `ErrorBoundary` يحمي `CustomersPage` أو `CustomerDetailsPage`. خطأ في رسم بياني واحد يُسقط الصفحة كاملة.

---

### 6. `CustomerHeroHeader` و `CustomerMobileProfile` يستقبلان مصفوفة الفواتير/المدفوعات الكاملة
**الأثر: أداء — تمرير 500 سجل كـ props لمكونات العرض**

في `CustomerDetailsPage.tsx` (سطر 301):
```
invoices={detail.invoices} payments={detail.payments}
```
هذه تُستخدم فقط لعرض `CustomerQuickHistory` و `CustomerKPICards` — يمكن استبدالها ببيانات مُجمّعة من `financialSummary` RPC.

---

### 7. `CustomerSavedViews` يستخدم `localStorage`
**الأثر: المشاهدات المحفوظة تضيع عند تغيير الجهاز/المتصفح**

في `CustomerSavedViews.tsx` — البيانات محفوظة محلياً فقط.

---

### 8. لا يوجد فلتر حسب الفئة (Category)
**الأثر: ميزة مفقودة رغم وجود جدول `customer_categories`**

`CustomerFiltersBar` لا يتضمن فلتر الفئة رغم أن `customerRepository.findCategories()` موجود.

---

### 9. ألوان hardcoded في الرسوم البيانية
**الأثر: عدم التوافق مع Dark Mode**

- `CashFlowLineChart.tsx` سطر 64: `stroke="hsl(142 71% 45%)"` — لون ثابت بدل design token
- `AgingDonutChart.tsx` سطر 18-19: ألوان ثابتة `hsl(45 93% 47%)` و `hsl(25 95% 53%)`

---

## خطة الإصلاح

### المرحلة 1: ربط RPC بالرسوم البيانية (الأولوية القصوى — دقة البيانات)

| المهمة | الملف | التغيير |
|--------|-------|---------|
| تعديل `CustomerPurchaseChart` | `CustomerPurchaseChart.tsx` | استقبال `chartData.monthly_data` بدل `invoices/payments` |
| تعديل `AgingDonutChart` | `AgingDonutChart.tsx` | استقبال بيانات aging من RPC (يتطلب إضافة aging_data إلى RPC) أو إبقاءها على الفواتير |
| تعديل `CashFlowLineChart` | `CashFlowLineChart.tsx` | استقبال `chartData.monthly_data` بدل `invoices/payments` |
| تعديل `TopProductsChart` | `TopProductsChart.tsx` | استقبال `chartData.top_products` بدل الاستعلام المستقل |
| تمرير `chartData` | `CustomerDetailsPage.tsx` | تمرير `detail.chartData` للرسوم البيانية في analytics tab |

### المرحلة 2: إزالة الاعتماد على الفواتير الخام في المكونات غير الضرورية

| المهمة | الملف | التغيير |
|--------|-------|---------|
| تقليل props في `CustomerHeroHeader` | `CustomerHeroHeader.tsx` + `CustomerDetailsPage.tsx` | إزالة `invoices/payments` props واستبدالها بالبيانات المُجمّعة الموجودة |
| تقليل props في `CustomerMobileProfile` | `CustomerMobileProfile.tsx` | نفس المنطق |

### المرحلة 3: UX + حماية

| المهمة | الملف | التغيير |
|--------|-------|---------|
| إضافة "تحديد الكل" | `CustomersPage.tsx` | إضافة Checkbox في toolbar مربوط بـ `bulk.toggleSelectAll` |
| إضافة `ErrorBoundary` | `CustomersPage.tsx` + `CustomerDetailsPage.tsx` | لف المكونات الرئيسية بـ ErrorBoundary |
| إصلاح ألوان hardcoded | `CashFlowLineChart.tsx` + `AgingDonutChart.tsx` | استخدام CSS variables |

### المرحلة 4: تحسينات اختيارية

| المهمة | الملف | التغيير |
|--------|-------|---------|
| إضافة فلتر الفئة | `CustomerFiltersBar.tsx` | إضافة dropdown للفئات |
| نقل Saved Views للقاعدة | `CustomerSavedViews.tsx` + migration | إنشاء جدول `user_saved_views` |

---

## التبعيات

```text
Phase 1 (Charts→RPC) → مستقل
Phase 2 (Remove raw data) → يعتمد على Phase 1
Phase 3 (UX) → مستقل
Phase 4 (Optional) → مستقل
```

