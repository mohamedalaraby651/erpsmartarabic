

# خطة المرحلة التالية: تطوير قسم الموردين (مع مراعاة الفروق)

## ما تم إنجازه سابقاً
- Repository Layer + Hooks + RPCs
- صفحة القائمة (StatsBar, FilterDrawer, ListRow, MobileView, SavedViews, BulkSelection)
- صفحة التفاصيل (HeroHeader, KPIs, Lazy Loading, URL Tab Sync, Charts, Pagination)
- الموبايل (MobileProfile, CompressedHeader, IconStrip)
- Quick Add + Export + Alerts + Permissions

## الفجوات المتبقية (مع مراعاة اختلاف الموردين عن العملاء)

### ما يجب تنفيذه:

| # | الميزة | ملاحظات الفروق |
|---|--------|----------------|
| 1 | **SupplierNotesTab** — تبويب ملاحظات | يستخدم جدول `supplier_notes` الموجود + إضافة عمود `is_pinned` + `user_id` |
| 2 | **SupplierPinnedNote** — ملاحظة مثبتة في الهيدر | مطابق للعملاء |
| 3 | **SupplierStatementTab** — كشف حساب تفاعلي | بدل الطباعة المباشرة فقط — يعرض جدول تفاعلي مع تصفية بالتاريخ + طباعة |
| 4 | **SupplierHealthBadge** — تقييم صحة المورد | مختلف: يعتمد على `dso` + `aging` + `rating` + التزام التسليم بدل credit score |
| 5 | **SupplierAgingReport** — تقرير أعمار تفصيلي | يعرض جدول + ملخص بدل رسم بياني فقط (مثل CustomerAgingReport) |
| 6 | **تقسيم HeroHeader** إلى sub-components | `HeroIdentity` + `HeroActions` + KPI Cards تفاعلية مع Timeline Drawer |
| 7 | **SupplierQuickHistory** — آخر 5 معاملات | يعرض آخر أوامر الشراء والمدفوعات (بدل الفواتير عند العملاء) |

### ما لا ينطبق على الموردين (لن يُنفذ):
- `SalesPipeline` — خاص بالعملاء (عروض → طلبات → فواتير)
- `CreditNotes Tab` — إشعارات الخصم خاصة بالعملاء
- `CommunicationLogTab` — أقل أهمية للموردين حالياً
- `CustomerReminderSection` — يمكن إضافته لاحقاً

---

## التفاصيل الفنية

### 1. Migration: تحديث supplier_notes
```sql
ALTER TABLE supplier_notes ADD COLUMN is_pinned BOOLEAN DEFAULT false;
ALTER TABLE supplier_notes ADD COLUMN user_id UUID REFERENCES auth.users(id);
UPDATE supplier_notes SET user_id = created_by::uuid WHERE created_by IS NOT NULL;
```

### 2. Migration: RPC `get_supplier_health_score`
- يحسب: `credit_score` (نسبة الرصيد لحد الائتمان) + `dso_score` + `aging_score` + `rating_score`
- يختلف عن العملاء: يضيف `rating` كعامل (خاص بالموردين)
- يُرجع `grade`: excellent / good / warning / critical

### 3. SupplierNotesTab (جديد)
- CRUD على `supplier_notes` مع pinning
- عرض timeline مع تاريخ + كاتب الملاحظة
- يستخدم `supplier_notes` بدل `customer_notes`

### 4. SupplierStatementTab (جديد)
- نسخة من `StatementOfAccount` معدلة للموردين
- يستخدم RPC `get_supplier_statement` الموجود فعلاً
- فلترة بالتاريخ + pagination + طباعة PDF

### 5. تقسيم HeroHeader
- `SupplierHeroIdentity.tsx` — avatar + name + badges + contact
- `SupplierHeroActions.tsx` — أزرار الإجراءات
- `SupplierKPICards.tsx` — 4 بطاقات KPI تفاعلية (مشتريات، مدفوعات، مستحق، طلبات)
- `SupplierTimelineDrawer.tsx` — عرض أحداث حسب نوع KPI (أوامر شراء + مدفوعات بدل فواتير)

### 6. SupplierQuickHistory
- آخر 3 أوامر شراء + آخر 3 مدفوعات (بدل الفواتير)

### 7. SupplierAgingReport
- جدول تفصيلي: 0-30 / 31-60 / 61-90 / 90+ يوم
- ملخص إجمالي + نسب مئوية
- يستخدم RPC `get_supplier_aging` الموجود

### 8. إضافة الـ tabs الجديدة في DetailsPage
- إضافة: notes, statement, aging-report
- إضافة HealthBadge في الهيدر
- إضافة QuickHistory في الهيدر
- إضافة PinnedNote تحت الهيدر

---

## ملخص الملفات

| الملف | النوع |
|-------|-------|
| Migration (supplier_notes + health RPC) | إنشاء |
| `src/components/suppliers/tabs/SupplierNotesTab.tsx` | إنشاء |
| `src/components/suppliers/tabs/SupplierStatementTab.tsx` | إنشاء |
| `src/components/suppliers/tabs/SupplierAgingReport.tsx` | إنشاء |
| `src/components/suppliers/hero/SupplierHeroIdentity.tsx` | إنشاء |
| `src/components/suppliers/hero/SupplierHeroActions.tsx` | إنشاء |
| `src/components/suppliers/hero/SupplierKPICards.tsx` | إنشاء |
| `src/components/suppliers/hero/SupplierTimelineDrawer.tsx` | إنشاء |
| `src/components/suppliers/hero/SupplierQuickHistory.tsx` | إنشاء |
| `src/components/suppliers/hero/SupplierHealthBadge.tsx` | إنشاء |
| `src/components/suppliers/hero/SupplierPinnedNote.tsx` | إنشاء |
| `src/components/suppliers/hero/SupplierHeroHeader.tsx` | إعادة كتابة (يستخدم sub-components) |
| `src/pages/suppliers/SupplierDetailsPage.tsx` | تعديل (tabs + hero جديدة) |

