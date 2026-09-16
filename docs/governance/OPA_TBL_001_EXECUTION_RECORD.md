# OPA-TBL-001 — Table Interaction Program, Stages 1–2

الحالة: **IMPLEMENTED / VERIFIED (Stages 1–2) — NOT ACCEPTED / NOT CERTIFIED**

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

1. PASS — 9/9 اختبارات مستهدفة: `applyColumnFilters` لأنواع النص/التاريخ/الرقم، و`useTableLayout` لعزل user/screen/version والترحيل الآمن.
2. PASS — `check-contract-purity`: scanned=5، violations=0.
3. PASS — `check-datagrid-domain-isolation`: scanned=3، violations=0.
4. PASS — إعادة توليد inventory أعطت ملفًا مطابقًا byte-for-byte للسجل المثبت.
5. PASS — الفحص الحي على `/invoices` عند 1280px:
   - أداة عرض الجدول ظاهرة.
   - root overflow = 0.
   - نطاق التاريخ المعكوس يعرض رسالة عربية بـ`role=alert` ويعطل «تطبيق».
6. PASS (Evidence سابق ضمن OPA-UI-003) — resize/reorder/persistence وzero REST requests أثناء تغييرات العرض، مع 360/768/1280.
7. BLOCKED (pre-existing, out of batch) — فحص التطبيق الكامل يبلغ TS7011 في `src/integrations/supabase/previewAuthStorage.ts:81,85`. الملف مولّد ومحظور، ولم تغيّره هذه الدفعة.

## 7. Known findings

- 69 surface رقم الحصر الحالي لهذه الأداة وحدها، وليس بديلًا عن تقارير أقدم ذات قواعد عد مختلفة.
- هناك ازدواجية حقيقية في أنظمة الفلاتر وتفضيلات العرض؛ تُعامل كمدخل للـrollout وليست تفويضًا لتنظيف معماري.
- خيارات الفلاتر ذات cardinality مرتفع تحتاج remote search في مرحلة Query Reliability، ولا تُعمّم آلية limit 500 بصمت.

## 8. Human gate

**IMPLEMENTED ≠ VERIFIED ≠ ACCEPTED/CERTIFIED.**  
لا تبدأ Pilot Wave قبل قبول شاشة الفواتير، وإغلاق تحقق هذه الدفعة، وتفويض الشاشة التالية منفردة.