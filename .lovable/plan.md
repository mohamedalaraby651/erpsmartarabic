

# خطة إكمال تحسين قسم العملاء — المرحلة 4 + المرحلة 5

## المرحلة 4: تحسينات UX والحماية (8 مهام)

### 4.1 تحذير البيانات غير المحفوظة — `CustomerFormDialog.tsx`
- استخدام `formState.isDirty` من react-hook-form
- إضافة `onInteractOutside` على `DialogContent` يمنع الإغلاق إذا كان النموذج dirty
- عند محاولة الإغلاق مع بيانات غير محفوظة → عرض `AlertDialog` تأكيد

### 4.2 عرض قائمة الأسعار المرتبطة — `CustomerHeroHeader.tsx`
- فحص `customer.price_list_id`
- إذا موجود → جلب اسم القائمة عبر query خفيف أو عرض Badge "قائمة أسعار مخصصة"
- عرض Badge بجانب VIP badge

### 4.3 تصدير كل العملاء — `CustomersPage.tsx`
- إضافة زر "تصدير الكل" بجانب `ExportWithTemplateButton` الحالي
- عند الضغط → جلب كل العملاء بدون `.range()` limit ثم تمرير البيانات للتصدير
- عرض loading أثناء الجلب

### 4.4 توضيح نطاق التحديد الجماعي — `CustomersPage.tsx`
- في شريط Bulk Actions، تغيير النص من "تم تحديد X عميل" إلى "تم تحديد X عميل من هذه الصفحة فقط"
- إضافة tooltip أو نص فرعي

### 4.5 إضافة `placeholderData: keepPreviousData` — `useCustomerQueries.ts`
- استيراد `keepPreviousData` من `@tanstack/react-query`
- إضافتها في query العملاء الرئيسي لمنع UI flash أثناء البحث/التصفح

### 4.6 طي الأقسام على الموبايل — `CustomerDetailsPage.tsx`
- تعيين `defaultOpen={false}` في `MobileDetailSection` لجميع الأقسام ما عدا "الفواتير" و"الملخص المالي"

### 4.7 تقسيم `CustomerFormDialog.tsx` (488 سطر)
- استخراج الأقسام كمكونات `React.memo` مستقلة:
  - `CustomerFormBasicInfo.tsx`
  - `CustomerFormContact.tsx`
  - `CustomerFormLocation.tsx`
  - `CustomerFormFinancial.tsx`
- تقليص الملف الأصلي إلى ~150 سطر orchestrator

### 4.8 توحيد Action Menu في GridView
- فحص `CustomerGridView.tsx` وإضافة dropdown menu (تعديل، حذف، فاتورة، واتساب) مثل TableView

---

## المرحلة 5: التوسع — DB + فلاتر متقدمة

### 5.1 فلتر "بدون تواصل منذ X يوم"
- العمود `last_communication_at` والـ trigger موجودان بالفعل ✅
- إضافة خيار فلتر في `FilterDrawer` بالصفحة الرئيسية
- تمرير الفلتر إلى `useCustomerQueries` → `.lte('last_communication_at', cutoffDate)`

### 5.2 فلتر "بدون فواتير منذ X يوم"
- استخدام `last_activity_at` (موجود في customers)
- نفس آلية الفلتر السابقة

### 5.3 DB Index (migration)
```sql
CREATE INDEX IF NOT EXISTS idx_invoices_customer_payment 
ON invoices(customer_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_customer 
ON payments(customer_id);
```

---

## ملخص الملفات المتأثرة

```text
تعديل:
  - CustomerFormDialog.tsx (dirty warning + split)
  - CustomerHeroHeader.tsx (price list badge)
  - CustomersPage.tsx (export all + bulk label)
  - useCustomerQueries.ts (keepPreviousData)
  - CustomerDetailsPage.tsx (mobile collapsed)
  - CustomerGridView.tsx (action menu)
  - useCustomerFilters.ts (advanced filters)

جديد:
  - src/components/customers/form/CustomerFormBasicInfo.tsx
  - src/components/customers/form/CustomerFormContact.tsx
  - src/components/customers/form/CustomerFormLocation.tsx
  - src/components/customers/form/CustomerFormFinancial.tsx

Migration:
  - DB indexes
```

## التنفيذ: مرحلتين متتاليتين
- **المرحلة 4 أولاً**: UX + حماية (4.1–4.8)
- **المرحلة 5 ثانياً**: فلاتر + DB indexes

