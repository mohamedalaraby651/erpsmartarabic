

# خطة الإصلاح الشاملة — وحدة العملاء (4 Sprints)

---

## Sprint 1 — الأمان وسلامة الأنواع (5 مهام)

### 1.1 إصلاح `any` في `applyFilters`
**الملف**: `src/lib/repositories/customerRepository.ts` سطر 76
**التغيير**: استبدال `any` بالنوع الصحيح من Supabase:
```typescript
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
function applyFilters(
  query: PostgrestFilterBuilder<Database['public'], Database['public']['Tables']['customers']['Row'], any>,
  filters: CustomerFilters
) { ... }
```

### 1.2 إضافة return types صريحة للـ methods الناقصة
**الملف**: `customerRepository.ts` سطور 419, 429, 463, 492
**التغيير**: إضافة أنواع إرجاع صريحة لـ `findSalesOrders`, `findQuotations`, `findReminders`, `findCommunications` بدلاً من الاعتماد على الاستنتاج الضمني:
```typescript
async findSalesOrders(customerId: string): Promise<SalesOrder[]> { ... }
async findQuotations(customerId: string): Promise<Quotation[]> { ... }
```
مع استيراد الأنواع من `Database['public']['Tables']`.

### 1.3 إضافة Permission Check قبل حذف العناوين
**الملف**: `src/hooks/customers/useCustomerDetail.ts` سطر 85-91
**التغيير**: إضافة `verifyPermissionOnServer('customers', 'delete')` داخل `mutationFn` قبل استدعاء `customerRepository.deleteAddress()`. إذا فشل الفحص → throw error بدون تنفيذ الحذف.

### 1.4 إضافة Permission Check قبل التصدير
**الملف**: `src/pages/customers/CustomersPage.tsx` سطر 103
**التغيير**: في `handleExportAll`، إضافة `verifyPermissionOnServer('customers', 'view')` قبل استدعاء `exportCustomersToExcel()`. عند الفشل → toast خطأ "غير مصرح بالتصدير".

### 1.5 تحذير المستخدم عند تجاوز حد التصدير
**الملف**: `src/lib/services/customerService.ts` سطر 127-167
**التغيير**: بعد جلب البيانات، مقارنة `data.length` مع `limit`. إذا `data.length === limit` → عرض toast تحذيري: "تم تصدير أول 5,000 عميل فقط. للتصدير الكامل تواصل مع المسؤول."

---

## Sprint 2 — Mobile Parity + إصلاح النموذج (4 مهام)

### 2.1 إضافة التبويبات المفقودة في Mobile Detail
**الملف**: `src/pages/customers/CustomerDetailsPage.tsx` سطور 113-143
**التغيير**: إضافة 5 أقسام `MobileDetailSection` مفقودة بنفس النمط الموجود:
- عروض الأسعار (quotations) — priority: low
- أوامر البيع (orders) — priority: low
- أعمار الديون (aging) — priority: low
- التحليلات (analytics) — priority: low
- سجل النشاط (activity) — priority: low

كل قسم يستخدم `Suspense` + نفس الـ lazy-loaded components الموجودة.

### 2.2 إصلاح حقول الاتصال المكررة للشركات
**الملف**: `src/components/customers/CustomerFormDialog.tsx` سطور 278-283
**المشكلة**: عند اختيار "شركة" يظهر `CustomerFormContact` مرتين — مرة مع `showCompanyFields` ومرة بدونه.
**الحل**: دمجهما في مكون واحد:
```tsx
<SectionHeader icon={Phone} title="معلومات الاتصال" />
<CustomerFormContact 
  showCompanyFields={customerType === 'company'} 
  idPrefix="desktop" 
/>
```
حذف سطر 282-283 (القسم المكرر).

### 2.3 إزالة زر "العودة" المكرر على Desktop
**الملف**: `src/pages/customers/CustomerDetailsPage.tsx`
**المشكلة**: `MobileDetailHeader` يعرض زر العودة + `CustomerHeroHeader` يعرض زر "العودة للعملاء" (سطر 39 في HeroHeader). كلاهما مرئي على Desktop.
**الحل**: في `CustomerDetailsPage`، لف `MobileDetailHeader` بشرط `isMobile` فقط، أو إخفاء زر العودة في `CustomerHeroHeader` عندما يكون الـ `MobileDetailHeader` مرئياً. الأفضل: إخفاء `CustomerHeroHeader` back button على mobile (`hidden md:flex`) لأن `MobileDetailHeader` يتولى ذلك.

### 2.4 مزامنة البحث مع URL
**الملف**: `src/hooks/customers/useCustomerFilters.ts`
**المشكلة**: `setSearchQuery` لا يستدعي `syncToUrl`. البحث لا يظهر في URL.
**الحل**: تعديل return object ليستخدم wrapper:
```typescript
setSearchQuery: (v: string) => { setSearchQuery(v); syncToUrl({ q: v }); }
```
ملاحظة: يجب الانتباه للـ debounce — الـ URL يجب أن يتحدث مع القيمة الفعلية وليس الـ debounced.

---

## Sprint 3 — UI Parity وتحسينات UX (5 مهام)

### 3.1 إضافة SelectAll في Grid mode
**الملف**: `src/components/customers/CustomerGridView.tsx`
**التغيير**: إضافة props `onToggleSelectAll` و `isAllSelected` ثم عرض `Checkbox` "تحديد الكل" فوق الـ grid:
```tsx
<div className="flex items-center gap-2 mb-3">
  <Checkbox checked={isAllSelected} onCheckedChange={onToggleSelectAll} />
  <span className="text-sm text-muted-foreground">تحديد الكل ({data.length})</span>
</div>
```
تمرير `toggleSelectAll` و `isAllSelected` من `CustomersPage`.

### 3.2 إضافة Active/Inactive counts في Stats Bar
**الملف**: `src/hooks/customers/useCustomerList.ts` سطر 58-70
**التغيير**: إضافة `active` و `inactive` من `get_customer_stats` RPC:
```typescript
active: d.active || 0,
inactive: d.inactive || 0,
```
**الملف**: `src/components/customers/CustomerStatsBar.tsx`
**التغيير**: إضافة stat جديد "نشط" و/أو "غير نشط" في المصفوفة. أو عرض "نشط/غير نشط" كـ badge فرعي تحت "إجمالي العملاء".

### 3.3 Empty State ذكي حسب الفلاتر
**الملف**: `src/pages/customers/CustomersPage.tsx` سطور 198-207
**التغيير**: التحقق من `filters.activeFiltersCount > 0 || filters.debouncedSearch`:
- إذا يوجد فلاتر نشطة → "لا توجد نتائج تطابق الفلاتر" + زر "إزالة الفلاتر"
- إذا لا يوجد فلاتر → Empty state الحالي (إضافة عميل + استيراد)

### 3.4 إضافة Status badge في Grid Cards
**الملف**: `src/components/customers/CustomerGridCard.tsx`
**التغيير**: إضافة badge "غير نشط" بجانب VIP badge عندما `customer.is_active === false`:
```tsx
{!customer.is_active && (
  <Badge variant="outline" className="text-xs text-muted-foreground">غير نشط</Badge>
)}
```

### 3.5 تنفيذ CustomerActionMenu variant mobile
**الملف**: `src/components/customers/CustomerActionMenu.tsx` سطر 77-78
**التغيير**: بدلاً من `return null`، تقديم مجموعة أزرار مناسبة للموبايل (icon buttons بحجم 44px). ثم استخدامه في `CustomerMobileView` عبر `DataCard` actions أو مباشرة.

---

## Sprint 4 — الأداء والقابلية للتوسع (3 مهام)

### 4.1 Cursor-based Export Pagination
**الملف**: `src/lib/repositories/customerRepository.ts` method `exportAll`
**التغيير**: تقسيم الاستعلام إلى batches من 1000:
```typescript
async exportAll(): Promise<Customer[]> {
  const batchSize = 1000;
  let allData: Customer[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase.from('customers').select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    offset += batchSize;
    if (data.length < batchSize) break;
  }
  return allData;
}
```
**الملف**: `customerService.ts` `exportCustomersToExcel` — تحديث progress toast مع كل batch.

### 4.2 إضافة Error Boundary لصفحة التفاصيل
**الملف**: `src/pages/customers/CustomerDetailsPage.tsx`
**التغيير**: لف كل `TabsContent` و `MobileDetailSection` بـ `ErrorBoundary` component (يمكن استخدام الموجود أو إنشاء `CustomerTabErrorBoundary` بسيط) لمنع تعطل الصفحة عند فشل تبويب واحد.

### 4.3 تحسين `findAllNamesAndPhones` بإضافة limit
**الملف**: `customerRepository.ts` سطر 513-518
**المشكلة**: يجلب **كل** العملاء بدون limit. لنظام بـ 50,000+ عميل = بطء.
**الحل**: إضافة `.limit(10000)` كحد أقصى، أو تحويلها لتقبل `search` param وترجع نتائج مفلترة فقط (حسب الاستخدام في Import dialog للتحقق من التكرارات).

---

## ملخص التأثير المتوقع

| المحور | قبل | بعد |
|---|---|---|
| Type Safety | 7/10 | 9/10 |
| Security | 7/10 | 9/10 |
| Mobile Parity | 6/10 | 9/10 |
| UX Polish | 7/10 | 9/10 |
| Scalability | 6/10 | 8/10 |
| **الإجمالي** | **7.6/10** | **8.8/10** |

## ترتيب الملفات المتأثرة

```text
تعديل (14 ملف):
  src/lib/repositories/customerRepository.ts    — Type safety + cursor export + limit
  src/lib/services/customerService.ts            — Export warning
  src/hooks/customers/useCustomerDetail.ts       — Permission check + Error boundary
  src/hooks/customers/useCustomerList.ts         — Active/Inactive stats
  src/hooks/customers/useCustomerFilters.ts      — Search URL sync
  src/pages/customers/CustomersPage.tsx          — Export permission + Smart empty state
  src/pages/customers/CustomerDetailsPage.tsx    — Mobile tabs + Back button fix + Error boundary
  src/components/customers/CustomerFormDialog.tsx — Fix duplicate contact section
  src/components/customers/CustomerActionMenu.tsx — Mobile variant
  src/components/customers/CustomerGridView.tsx   — SelectAll checkbox
  src/components/customers/CustomerGridCard.tsx   — Status badge
  src/components/customers/CustomerStatsBar.tsx   — Active/Inactive counts
  src/components/customers/CustomerHeroHeader.tsx — Hide back on mobile
  src/components/customers/CustomerMobileView.tsx — Use ActionMenu (optional)
```

