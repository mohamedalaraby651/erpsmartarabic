# OPA-TBL-001 — Table Interaction Program, Stages 1–2

الحالة: **IMPLEMENTED (Stages 1–2) — VERIFICATION PENDING — NOT ACCEPTED / NOT CERTIFIED**

## 1. Authorized scope

- المرحلة 1: Inventory & Contract Freeze.
- المرحلة 2: Canonical Interaction Kit.
- لا Pilot rollout ولا تعميم على أي شاشة بعد الفواتير.
- لا business rules أو migrations أو RLS أو permissions أو financial/stock semantics.

## 2. Static inventory

- الأداة القابلة للتكرار: `scripts/audits/table-interaction-inventory.mjs`.
- الناتج: `docs/governance/OPA_TBL_001_INVENTORY.md`.
- الحصر الأولي: **69 سطح جدول مرشح** داخل الصفحات والمكونات.
- الأنماط القائمة منفصلة:
  1. نمط OPA-UI-003 الكامل — الفواتير فقط.
  2. Drawer/Chips المخصص — العملاء والموردون.
  3. `ColumnCustomizer/useTableCustomization` — لا استهلاك مثبت، ولا يُعتمد تلقائيًا.
- الحصر Static Trace فقط؛ لا يثبت التشغيل أو صلاحية التعميم.

## 3. Frozen interaction contract

- توسعة `DataGridContract` بعقود compile-time فقط:
  - `GridFilterKind`.
  - `GridColumnInteractionSpec` لوصف العرض والتفاعل دون أسماء قاعدة بيانات.
  - `GridPresentationState` لحالة العرض المحلية.
  - إضافة `medium` إلى `DensityMode` لمطابقة المرجع المثبت.
- mapping الأعمدة إلى مصدر البيانات يبقى في Application/Query hook الخاص بكل شاشة.
- العقد الدلالي ثابت: OR داخل العمود وAND بين الأعمدة.
- الأعمدة المشتقة تُعلّم `derived` ولا تُفلتر خادميًا بلا mapping صريح.

## 4. Canonical Interaction Kit changes

- `DataTableToolbar`: غلاف ترتيب فقط للبحث، أدوات العرض، الإجراءات والحالة؛ لا يعرف البيانات أو الاستعلام.
- `ColumnFilterHeader`:
  - `aria-sort` لحالة الفرز.
  - منع تطبيق نطاق تاريخ/رقم إذا كانت البداية أكبر من النهاية.
- `ActiveFiltersBar`: إعلان تغيّر عدد النتائج عبر `aria-live`.
- `TableViewOptions`:
  - ترتيب بالسحب داخل لوحة التخصيص.
  - بقاء أزرار أعلى/أسفل كبديل قابل للوصول.
  - أهداف تفاعل أكبر داخل قائمة الأعمدة.
- `useTableLayout`:
  - مفتاح `version + user + screen`.
  - قراءة المفتاح القديم وترحيله عند الحفظ التالي.
  - إزالة الأعمدة القديمة من الحالة المحفوظة بأمان.
  - `moveColumnTo` للترتيب بالسحب، وهو UI state فقط.
- شاشة الفواتير تستخدم `DataTableToolbar` كإثبات تكامل دون تغيير query behavior.

## 5. Explicit non-goals

- لم تُحوّل أوامر البيع أو العروض أو أوامر الشراء أو المنتجات أو المدفوعات.
- لم تُحذف الأنظمة القديمة، ولم يُعاد بناء محرك الفلاتر.
- لم تُوسّع Saved Views إلى schema جديد.
- لم تُغيّر `previewAuthStorage.ts` لأنه ملف مولّد ومحظور، رغم وجود عطل types سابق مستقل.

## 6. Verification gates

1. اختبارات `applyColumnFilters` تثبت OR/AND وأنواع النص/التاريخ/الرقم.
2. اختبارات `useTableLayout` تثبت عزل user/screen/version والترحيل الآمن.
3. contract purity وDataGrid domain isolation.
4. فحص حي للفواتير: keyboard، invalid ranges، drag reorder، reload persistence، zero data requests أثناء layout changes.
5. 360/768/1280 + RTL + light/dark evidence.

## 7. Known findings

- 69 surface رقم الحصر الحالي لهذه الأداة وحدها، وليس بديلًا عن تقارير أقدم ذات قواعد عد مختلفة.
- هناك ازدواجية حقيقية في أنظمة الفلاتر وتفضيلات العرض؛ تُعامل كمدخل للـrollout وليست تفويضًا لتنظيف معماري.
- خيارات الفلاتر ذات cardinality مرتفع تحتاج remote search في مرحلة Query Reliability، ولا تُعمّم آلية limit 500 بصمت.

## 8. Human gate

**IMPLEMENTED ≠ VERIFIED ≠ ACCEPTED/CERTIFIED.**  
لا تبدأ Pilot Wave قبل قبول شاشة الفواتير، وإغلاق تحقق هذه الدفعة، وتفويض الشاشة التالية منفردة.