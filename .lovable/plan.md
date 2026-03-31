

# خطة تنفيذ التوصيات — قسم العملاء

مقسمة إلى 4 مراحل مرتبة حسب الأولوية والتأثير.

---

## المرحلة 1: إصلاحات عالية الأولوية (وظيفية + أداء)

### الخطوة 1.1 — تحويل `useCustomerAlerts` إلى Lazy Loading
**الملف:** `src/hooks/useCustomerAlerts.ts` + `src/pages/customers/CustomersPage.tsx`

- إضافة parameter `enabled` إلى `useCustomerAlerts(enabled: boolean)`
- جعل الاستعلامين (`customers` + `overdueInvoices`) يعتمدان على `enabled`
- في `CustomersPage.tsx`: تمرير `enabled={!alertsDismissed}` — بحيث لا تُجلب البيانات إذا كان المستخدم أغلق التنبيهات
- النتيجة: توفير استعلامين على كل تحميل صفحة عند عدم الحاجة

### الخطوة 1.2 — Server Pagination لتبويبات التفاصيل (الفواتير + المدفوعات)
**الملفات:**
- `src/lib/repositories/customerRepository.ts` — إضافة `findInvoicesPaginated(customerId, page, pageSize)` و `findPaymentsPaginated(customerId, page, pageSize)` مع `count: 'exact'`
- `src/hooks/customers/useCustomerDetail.ts` — إضافة state لـ `invoicePage` و `paymentPage` مع استخدام الاستعلامات الجديدة
- `src/components/customers/tabs/CustomerTabInvoices.tsx` — إضافة `ServerPagination` في أسفل التبويب
- `src/components/customers/tabs/CustomerTabPayments.tsx` — نفس الشيء
- الحفاظ على الاستعلامات الحالية (limit 500) للحسابات المالية في KPI/Financial Summary كما هي (لا تتأثر)

### الخطوة 1.3 — إصلاح تصدير القالب ليشمل كل العملاء
**الملف:** `src/pages/customers/CustomersPage.tsx`

- تغيير `ExportWithTemplateButton` من `data={customers}` (25 عميل) إلى استدعاء `customerRepository.exportAll()` عند التصدير
- أو: إخفاء زر القالب واستخدام `handleExportAll` فقط مع إضافة خيار اختيار التنسيق (Excel/CSV)

---

## المرحلة 2: تحسينات الأداء

### الخطوة 2.1 — Cache لفحص الصلاحيات عند التصدير
**الملف:** `src/pages/customers/CustomersPage.tsx`

- نقل `verifyPermissionOnServer('customers', 'view')` إلى `useQuery` مع `staleTime: 300000` بدلاً من استدعائه عند كل نقرة تصدير
- استخدام النتيجة المخزنة مؤقتاً في `handleExportAll`

### الخطوة 2.2 — رفع حد التصدير أو إضافة تصدير خلفي
**الملف:** `src/lib/repositories/customerRepository.ts` + `src/lib/services/customerService.ts`

- رفع `maxRecords` من 10,000 إلى 50,000 مع تقسيم الدفعات
- إضافة `onProgress` callback لعرض شريط تقدم أثناء التصدير الطويل
- في `customerService.ts`: تحديث `exportCustomersToExcel` لعرض نسبة التقدم عبر `sonnerToast.loading`

---

## المرحلة 3: تحسينات تجربة البحث

### الخطوة 3.1 — تقليل الاستعلامات المكررة في البحث
**الملف:** `src/components/customers/CustomerSearchPreview.tsx`

- استخدام نفس `queryKey` المستخدم في `useCustomerList` عندما يكون البحث متطابقاً — أو زيادة `staleTime` إلى 30 ثانية لتقليل الطلبات المتكررة
- الأفضل: إبقاء SearchPreview كاستعلام مستقل (لأنه يجلب حقول مختلفة وأقل) مع رفع staleTime

### الخطوة 3.2 — إصلاح onBlur race condition
**الملف:** `src/components/customers/CustomerSearchPreview.tsx`

- استبدال `setTimeout(() => setIsFocused(false), 200)` بـ `handleClickOutside` الموجود بالفعل
- إزالة `onBlur` والاعتماد فقط على `mousedown` event listener الخارجي لإغلاق الـ dropdown
- النتيجة: إزالة race condition مع الحفاظ على نفس السلوك

---

## المرحلة 4: تحسينات UX

### الخطوة 4.1 — تقليل ازدحام هيدر Desktop
**الملف:** `src/components/customers/CustomerPageHeader.tsx`

- التأكد من أن الأزرار الثانوية (كشف المكررين، دمج، استيراد) مجمعة في dropdown "أدوات" (تم جزئياً)
- إبقاء فقط: `إضافة عميل` + `تصدير Excel` + `⋮ أدوات` على Desktop
- إزالة العنوان المكرر "قائمة العملاء (X)" من `CardHeader` في `CustomersPage.tsx` أو تبسيطه

### الخطوة 4.2 — إزالة Card wrapper الزائد من الجدول
**الملف:** `src/pages/customers/CustomersPage.tsx`

- استبدال `<Card><CardHeader>...<CardContent>` بـ `<div>` بسيط مع الحفاظ على view mode toggle و sort selector
- النتيجة: توفير مساحة عمودية وإزالة العنوان المكرر

---

## ملخص الملفات المتأثرة

| الملف | المرحلة | التغيير |
|---|---|---|
| `useCustomerAlerts.ts` | 1.1 | إضافة `enabled` parameter |
| `CustomersPage.tsx` | 1.1, 1.3, 4.1, 4.2 | Lazy alerts + إصلاح تصدير + تبسيط Card |
| `customerRepository.ts` | 1.2, 2.2 | Paginated queries + رفع حد التصدير |
| `useCustomerDetail.ts` | 1.2 | إضافة pagination state للتبويبات |
| `CustomerTabInvoices.tsx` | 1.2 | إضافة ServerPagination |
| `CustomerTabPayments.tsx` | 1.2 | إضافة ServerPagination |
| `CustomerSearchPreview.tsx` | 3.1, 3.2 | رفع staleTime + إصلاح onBlur |
| `customerService.ts` | 2.2 | شريط تقدم التصدير |
| `CustomerPageHeader.tsx` | 4.1 | تنظيم أزرار Desktop |

**إجمالي:** 9 ملفات، 4 مراحل، ~10 تغييرات مستقلة.

