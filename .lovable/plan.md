# خطة إعادة هيكلة قسم العملاء

## الوضع الحالي
- **96 ملف** | **~11,000 سطر** كود
- **48 ملف** في المجلد الجذري `src/components/customers/` — مسطح جداً
- **4 مكونات ميتة** لا تُستخدم في أي مكان (1,112 سطر مهدرة)
- **دالة تصدير مكررة** في `customerService.ts` لم تعد مستخدمة
- **MobileCustomerView** مكتوبة داخل `CustomerDetailsPage.tsx` (120 سطر)
- أنواع TypeScript مكررة في عدة ملفات

## المرحلة 1: حذف الكود الميت (Dead Code Removal)

### 1.1 حذف مكونات غير مستخدمة
| الملف | السطور | السبب |
|-------|--------|-------|
| `CustomerTableView.tsx` | 286 | لم يعد مستخدماً — استُبدل بـ `CustomerListRow` |
| `CustomerGridView.tsx` | 111 | لم يعد مستخدماً — يستورد `CustomerGridCard` فقط |
| `CustomerGridCard.tsx` | 140 | مستخدم فقط من `CustomerGridView` المحذوف |
| `CustomerGridSkeleton.tsx` | 32 | skeleton لعرض الشبكة المحذوف |
| `CustomerStatsGrid.tsx` | 168 | لم يعد مستخدماً — استُبدل بـ `CustomerStatsBar` |
| **المجموع** | **737 سطر** | |

### 1.2 إزالة دالة التصدير القديمة
- `exportCustomersToExcel` في `customerService.ts` — استُبدلت بـ `useCustomerExport` hook

## المرحلة 2: إعادة تنظيم المجلدات

### الهيكل الحالي (48 ملف في الجذر)
```
src/components/customers/
├── alerts/          (4 ملفات) ✅
├── charts/          (3 ملفات) ✅
├── form/            (4 ملفات) ✅
├── hero/            (3 ملفات) ✅
├── mobile/          (4 ملفات) ✅
├── tabs/            (9 ملفات) ✅
└── 48 ملف في الجذر ❌
```

### الهيكل المقترح
```
src/components/customers/
├── alerts/          → بدون تغيير (4 ملفات)
├── charts/          → بدون تغيير (3 ملفات)
├── form/            → بدون تغيير (4 ملفات)
├── hero/            → بدون تغيير (3 ملفات)
├── mobile/          → + MobileCustomerView من DetailsPage (5 ملفات)
├── tabs/            → بدون تغيير (9 ملفات)
├── list/            → جديد: مكونات القائمة
│   ├── CustomerListCard.tsx
│   ├── CustomerListRow.tsx
│   ├── CustomerListSkeleton.tsx
│   ├── CustomerMobileView.tsx
│   ├── CustomerEmptyState.tsx
│   └── index.ts
├── details/         → جديد: مكونات التفاصيل
│   ├── CustomerSmartAlerts.tsx
│   ├── CustomerKPICards.tsx
│   ├── CustomerPinnedNote.tsx
│   ├── CustomerTimelineDrawer.tsx
│   ├── CustomerAgingReport.tsx
│   ├── CustomerFinancialSummary.tsx
│   ├── CustomerPurchaseChart.tsx
│   ├── CommunicationLogTab.tsx
│   ├── ActivityDiffViewer.tsx
│   ├── StatementOfAccount.tsx
│   ├── CustomerReminderDialog.tsx
│   ├── CustomerSalesPipeline.tsx
│   ├── CustomerQuickHistory.tsx
│   ├── CustomerHealthBadge.tsx
│   └── index.ts
├── dialogs/         → جديد: النوافذ المنبثقة
│   ├── CustomerFormDialog.tsx
│   ├── CustomerDialogManager.tsx
│   ├── CustomerQuickAddDialog.tsx
│   ├── CustomerAddressDialog.tsx
│   ├── CustomerMergeDialog.tsx
│   ├── CustomerImportDialog.tsx
│   ├── CustomerExportDialog.tsx
│   ├── DuplicateDetectionDialog.tsx
│   └── index.ts
├── filters/         → جديد: مكونات الفلترة والترتيب
│   ├── CustomerFiltersBar.tsx
│   ├── CustomerFilterDrawer.tsx
│   ├── CustomerSavedViews.tsx
│   ├── CustomerColumnSettings.tsx
│   ├── CustomerSearchPreview.tsx
│   └── index.ts
├── shared/          → جديد: المشتركة
│   ├── CustomerAvatar.tsx
│   ├── CustomerActionMenu.tsx
│   ├── CustomerErrorBoundary.tsx
│   └── index.ts
├── CustomerPageHeader.tsx   → يبقى في الجذر (مستوى صفحة)
├── CustomerStatsBar.tsx     → يبقى في الجذر (مستوى صفحة)
└── CustomerHeroHeader.tsx   → يبقى في الجذر (مستوى صفحة)
```

## المرحلة 3: استخراج المكونات الكبيرة

### 3.1 استخراج MobileCustomerView من CustomerDetailsPage
- **الملف**: `CustomerDetailsPage.tsx` (411 سطر)
- **المكون**: `MobileCustomerView` (الأسطر 76-221 = 145 سطر)
- **النقل إلى**: `src/components/customers/mobile/MobileCustomerDetailView.tsx`
- **النتيجة**: `CustomerDetailsPage` ينخفض من 411 → ~270 سطر

### 3.2 استخراج منطق الـ Infinite Scroll من CustomersPage
- **الملف**: `CustomersPage.tsx` (402 سطر)
- **المنطق**: أسطر 93-178 (إدارة الصفحات + IntersectionObserver)
- **النقل إلى**: `src/hooks/customers/useInfiniteCustomers.ts`
- **النتيجة**: `CustomersPage` ينخفض من 402 → ~320 سطر

## المرحلة 4: تنظيف الأنواع والثوابت

### 4.1 توحيد تعريفات الأنواع
- `customerRepository.ts` يعرّف `Customer` محلياً (سطر 10)
- `customerConstants.ts` يصدّر `Customer` type
- `CustomerFormDialog.tsx` يعرّف `Customer` محلياً (سطر 35)
- **الحل**: استخدام `import type { Customer } from '@/lib/customerConstants'` في كل مكان

### 4.2 نقل ألوان VIP المكررة
- `vipBorderAccent` معرّف في كل من `CustomerListCard.tsx` (سطر 32) و `CustomerListRow.tsx` (سطر 24)
- **الحل**: نقلها إلى `customerConstants.ts`

## المرحلة 5: تنظيف Repository

### 5.1 فصل customerRepository.ts (610 سطر)
```
src/lib/repositories/
├── customerRepository.ts      → CRUD + Filters + Stats (300 سطر)
├── customerRelationsRepo.ts   → Invoices, Payments, Orders, etc. (200 سطر)
└── customerSearchRepo.ts      → Search, Duplicates, Export (110 سطر)
```

## المرحلة 6: تحديث barrel exports

### إنشاء ملفات index.ts لكل مجلد جديد
لتسهيل الاستيراد:
```typescript
// قبل
import { CustomerListRow } from "@/components/customers/CustomerListRow";
import { CustomerMobileView } from "@/components/customers/CustomerMobileView";

// بعد
import { CustomerListRow, CustomerMobileView } from "@/components/customers/list";
```

## ملخص التأثير

| المقياس | قبل | بعد | التحسن |
|---------|-----|-----|--------|
| ملفات في الجذر | 48 | 3 | -94% |
| كود ميت | 737 سطر | 0 | -100% |
| أكبر ملف صفحة | 411 سطر | ~270 سطر | -34% |
| أكبر repository | 610 سطر | ~300 سطر | -51% |
| أنواع مكررة | 4 أماكن | 1 مكان | موحد |
| ثوابت مكررة | 2 أماكن | 1 مكان | موحد |

## ترتيب التنفيذ
1. **المرحلة 1** — حذف الكود الميت (أسرع مكسب)
2. **المرحلة 4** — توحيد الأنواع (يجب قبل النقل)
3. **المرحلة 2** — إعادة تنظيم المجلدات
4. **المرحلة 3** — استخراج المكونات الكبيرة
5. **المرحلة 5** — فصل Repository
6. **المرحلة 6** — barrel exports
