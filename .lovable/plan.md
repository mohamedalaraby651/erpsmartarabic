

# خطة إعادة هيكلة قسم العملاء

## الهدف
تنظيم 48 ملف مبعثر في مجلد واحد إلى مجلدات فرعية متخصصة، حذف الكود الميت (~700 سطر)، وتقسيم الملفات الكبيرة.

---

## المرحلة 1: حذف الكود الميت (5 ملفات + دالة)

حذف الملفات التالية — تم التأكد أنها غير مستوردة في أي مكان:

| الملف | السطور |
|-------|--------|
| `CustomerTableView.tsx` | ~180 |
| `CustomerGridView.tsx` | ~120 |
| `CustomerGridCard.tsx` | ~150 |
| `CustomerGridSkeleton.tsx` | ~30 |
| `CustomerStatsGrid.tsx` | ~100 |

حذف دالة `exportCustomersToExcel` من `customerService.ts` (السطور 73-126) — تم استبدالها بـ `useCustomerExport` hook.

---

## المرحلة 2: إعادة تنظيم المجلدات

نقل الملفات من `src/components/customers/` المسطح إلى مجلدات فرعية:

```text
src/components/customers/
├── list/                    ← مكونات صفحة القائمة
│   ├── CustomerListRow.tsx
│   ├── CustomerListCard.tsx
│   ├── CustomerListSkeleton.tsx
│   ├── CustomerMobileView.tsx
│   ├── CustomerStatsBar.tsx
│   ├── CustomerEmptyState.tsx
│   ├── CustomerSavedViews.tsx
│   ├── CustomerColumnSettings.tsx
│   ├── CustomerPageHeader.tsx
│   └── index.ts
│
├── details/                 ← مكونات صفحة التفاصيل
│   ├── CustomerHeroHeader.tsx
│   ├── CustomerKPICards.tsx
│   ├── CustomerHealthBadge.tsx
│   ├── CustomerPinnedNote.tsx
│   ├── CustomerSmartAlerts.tsx
│   ├── CustomerFinancialSummary.tsx
│   ├── CustomerSalesPipeline.tsx
│   ├── CustomerQuickHistory.tsx
│   ├── CustomerTimelineDrawer.tsx
│   ├── CustomerPurchaseChart.tsx
│   ├── CustomerAgingReport.tsx
│   ├── CustomerErrorBoundary.tsx
│   ├── ActivityDiffViewer.tsx
│   ├── CommunicationLogTab.tsx
│   ├── StatementOfAccount.tsx
│   └── index.ts
│
├── dialogs/                 ← نوافذ الحوار
│   ├── CustomerFormDialog.tsx
│   ├── CustomerQuickAddDialog.tsx
│   ├── CustomerAddressDialog.tsx
│   ├── CustomerDialogManager.tsx
│   ├── CustomerImportDialog.tsx
│   ├── CustomerMergeDialog.tsx
│   ├── CustomerExportDialog.tsx
│   ├── CustomerReminderDialog.tsx
│   ├── DuplicateDetectionDialog.tsx
│   └── index.ts
│
├── filters/                 ← الفلاتر
│   ├── CustomerFiltersBar.tsx
│   ├── CustomerFilterDrawer.tsx
│   ├── CustomerSearchPreview.tsx
│   └── index.ts
│
├── shared/                  ← مكونات مشتركة
│   ├── CustomerAvatar.tsx
│   ├── CustomerActionMenu.tsx
│   └── index.ts
│
├── alerts/                  ← (موجود بالفعل)
├── charts/                  ← (موجود بالفعل)
├── form/                    ← (موجود بالفعل)
├── hero/                    ← (موجود بالفعل)
├── mobile/                  ← (موجود بالفعل)
└── tabs/                    ← (موجود بالفعل)
```

---

## المرحلة 3: تقسيم Repository الكبير

تقسيم `customerRepository.ts` (610 سطر) إلى 3 ملفات:

| الملف الجديد | المحتوى | السطور |
|-------------|---------|--------|
| `customerRepository.ts` | Core CRUD + Bulk + Stats + Categories + applyFilters | ~250 |
| `customerRelationsRepo.ts` | Invoices, Payments, Credit Notes, Orders, Quotations, Activities, Reminders, Communications | ~220 |
| `customerSearchRepo.ts` | Search, Duplicates, Export, Prefetch, Import | ~140 |

كل ملف يصدّر object، ويتم إعادة تصديرها من `index.ts` في `src/lib/repositories/`.

---

## المرحلة 4: استخراج hook التمرير اللانهائي

استخراج منطق infinite scroll (~60 سطر) من `CustomersPage.tsx` إلى hook جديد:

**ملف جديد:** `src/hooks/customers/useInfiniteCustomers.ts`

يشمل: `mobilePages`, `desktopPages`, `handleLoadMore`, `desktopSentinelRef`, وإعادة التعيين عند تغيير الفلاتر.

هذا يقلل `CustomersPage.tsx` من ~400 سطر إلى ~320 سطر.

---

## المرحلة 5: تحديث جميع الاستيرادات

تحديث الاستيرادات في الملفات التالية لتعكس المسارات الجديدة:
- `CustomersPage.tsx` (~15 import)
- `CustomerDetailsPage.tsx` (~20 import)
- `CustomerPageHeader.tsx` (SearchPreview)
- `CustomerFiltersBar.tsx` (SearchPreview)
- `CustomerHeroHeader.tsx` (QuickHistory)
- `hero/HeroIdentity.tsx` (HealthBadge)

---

## المرحلة 6: إضافة barrel exports

إنشاء `index.ts` في كل مجلد فرعي جديد (`list/`, `details/`, `dialogs/`, `filters/`, `shared/`) لتنظيف الاستيرادات.

---

## ملخص التأثير

| المقياس | قبل | بعد |
|---------|------|------|
| ملفات في الجذر | 48 | 0 |
| ملفات ميتة | 5 | 0 |
| كود ميت (سطور) | ~700 | 0 |
| حجم Repository | 610 سطر | 250 + 220 + 140 |
| حجم CustomersPage | ~400 سطر | ~320 سطر |

## ترتيب التنفيذ
1. حذف الكود الميت (المرحلة 1)
2. إنشاء المجلدات ونقل الملفات (المرحلة 2)
3. تقسيم Repository (المرحلة 3)
4. استخراج useInfiniteCustomers (المرحلة 4)
5. تحديث الاستيرادات (المرحلة 5)
6. إضافة barrel exports (المرحلة 6)

