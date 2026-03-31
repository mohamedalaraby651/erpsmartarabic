

# خطة التحسين الشاملة — صفحة تفاصيل العميل (الجولة الثالثة)

---

## التحليل النقدي — المشاكل المكتشفة

### مشكلة 1: غياب CLV (قيمة العميل مدى الحياة) من الإحصاءات
`useCustomerDetail` يحسب `clv` عبر `calculateCustomerHealth` لكنه **لا يُرجعه** في الـ return object (سطر 116). القيمة محسوبة ومهملة تماماً — لا تظهر في StatsGrid ولا في بطاقات الموبايل ولا في الملخص المالي.

**الحل:** إضافة `clv` للـ return + عرضه في StatsGrid والموبايل.

---

### مشكلة 2: الملخص المالي (CustomerFinancialSummary) يعيد حساب KPIs بدلاً من استخدام القيم المحسوبة
الملخص المالي يحسب `paymentRatio` و `creditUsage` و `avgInvoice` محلياً (سطور 26-28) رغم أن نفس القيم محسوبة بالفعل في `useCustomerDetail`. هذا يسبب:
- تكرار منطق الحساب (DRY violation)
- إمكانية تفاوت الأرقام بين StatsGrid والملخص المالي

**الحل:** تمرير `paymentRatio`, `avgInvoiceValue`, `dso`, `clv` كـ props بدلاً من إعادة حسابها.

---

### مشكلة 3: كشف الحساب (StatementOfAccount) — `useMemo` يستدعي `setCurrentPage` داخله
سطر 92: `useMemo(() => setCurrentPage(1), [dateFrom, dateTo])` — هذا anti-pattern: استدعاء setState داخل useMemo يسبب render إضافي وقد يتجاهله React في بعض الحالات.

**الحل:** استبداله بـ `useEffect`.

---

### مشكلة 4: الرسم البياني (CustomerPurchaseChart) لا يتكيف مع الموبايل
ارتفاع ثابت 350px مع margins كبيرة (left: 20, right: 20). على شاشة 393px، المحور Y يقتطع مساحة كبيرة والأعمدة تصبح ضيقة جداً. لا يوجد أي responsive behavior.

**الحل:** تقليل الارتفاع على الموبايل (250px)، تصغير margins، واستخدام `tick={{ fontSize: 9 }}` على الشاشات الصغيرة.

---

### مشكلة 5: CommunicationLogTab يستخدم query مستقل خارج useCustomerDetail
كل التبويبات الأخرى تستخدم بيانات من `useCustomerDetail` (lazy loaded)، لكن `CommunicationLogTab` ينشئ query خاص به (سطر 49-53). هذا يعني:
- لا يستفيد من lazy loading المبني على `activeTab`
- لا يتم invalidate عند تحديث بيانات العميل العامة

**ملاحظة:** هذا مقبول معمارياً لأن الـ tab يحتاج mutation أيضاً، لكنه يحتاج `enabled` مرتبط بفتح التبويب.

---

### مشكلة 6: تبويبات الموبايل تدمج "التحليلات" مع "التواصل" و"النشاط" في تبويب واحد
تبويب "التحليلات" على الموبايل (سطر 234-238) يعرض 3 مكونات ثقيلة:
- `CustomerPurchaseChart` (رسم بياني)
- `CommunicationLogTab` (قائمة + dialog)
- `CustomerTabActivity` (timeline)

هذا يسبب scroll طويل جداً ويخلط بين الرسم البياني وسجل التواصل والنشاط.

**الحل:** فصل "التواصل" إلى تبويب الموبايل "المزيد" أو إنشاء تبويب فرعي.

---

### مشكلة 7: لا يوجد مؤشر عدد (Badge count) على تبويبات الموبايل
تبويبات الموبايل تعرض أيقونة + نص فقط. لا يوجد مؤشر لعدد الفواتير أو المدفوعات. المستخدم لا يعرف إذا كان هناك بيانات قبل فتح التبويب.

**الحل:** إضافة badge صغير بالعدد بجانب اسم التبويب (مثل: "الفواتير (12)").

---

### مشكلة 8: StatsGrid — بطاقة "آخر شراء" تستخدم `text-sm` بينما الباقي `text-lg`
سطر 144: `text-sm font-medium` بينما كل البطاقات الأخرى تستخدم `text-lg font-bold`. هذا يكسر التناسق البصري.

**الحل:** توحيد الحجم لـ `text-lg font-bold`.

---

### مشكلة 9: الإشعارات الدائنة (CustomerTabCreditNotes) بدون وحدة عملة
سطر 57: `{totalReturns.toLocaleString()}` بدون "ج.م" — بينما كل Summary bars الأخرى تضيف الوحدة.

**الحل:** إضافة "ج.م" بعد المبلغ.

---

### مشكلة 10: عروض الأسعار وأوامر البيع — القوائم بدون ترقيم صفحات
كلا التبويبين يستخدمان `slice(0, 50)` بدون pagination. إذا كان لدى العميل أكثر من 50 عرض سعر، يتم قصها بصمت بدون إشعار المستخدم.

**الحل:** إضافة pagination مماثل للفواتير والمدفوعات.

---

## خطة التنفيذ المرحلية

### الخطوة 1: إصلاح البيانات والمنطق (useCustomerDetail + Financial Summary)
- إضافة `clv` للـ return object في `useCustomerDetail`
- تمرير `paymentRatio`, `avgInvoiceValue`, `dso`, `clv` كـ props إلى `CustomerFinancialSummary` بدلاً من إعادة حسابها
- تحديث `CustomerFinancialSummary` لاستقبال القيم المحسوبة + إضافة بطاقة CLV

### الخطوة 2: إصلاح StatsGrid + بطاقات الموبايل
- توحيد حجم الخط في بطاقة "آخر شراء" (`text-lg font-bold`)
- إضافة بطاقة CLV في StatsGrid وبطاقات الموبايل

### الخطوة 3: إصلاح كشف الحساب (StatementOfAccount)
- استبدال `useMemo(() => setCurrentPage(1))` بـ `useEffect`

### الخطوة 4: تحسين الرسم البياني للموبايل (CustomerPurchaseChart)
- ارتفاع responsive (250px على الموبايل، 350px على desktop)
- تصغير margins و font-size على الشاشات الصغيرة

### الخطوة 5: تحسين تبويبات الموبايل
- إضافة badge count للتبويبات (عدد الفواتير، المدفوعات، إلخ)
- نقل `CommunicationLogTab` من تبويب "التحليلات" إلى تبويب "المزيد"
- تخفيف حمل تبويب "التحليلات" (يبقى فيه الرسم البياني + سجل النشاط فقط)

### الخطوة 6: إضافة Pagination لعروض الأسعار وأوامر البيع
- تطبيق نفس نمط الترقيم المستخدم في الفواتير والمدفوعات (PAGE_SIZE = 20)

### الخطوة 7: إصلاح الإشعارات الدائنة
- إضافة "ج.م" لوحدة العملة في Summary bar

---

## الملفات المتأثرة

```text
معدّلة (8):
  src/hooks/customers/useCustomerDetail.ts     — إرجاع clv
  src/components/customers/CustomerFinancialSummary.tsx — props جديدة + بطاقة CLV
  src/components/customers/CustomerStatsGrid.tsx — بطاقة CLV + إصلاح font آخر شراء
  src/components/customers/StatementOfAccount.tsx — useMemo → useEffect
  src/components/customers/CustomerPurchaseChart.tsx — responsive chart
  src/components/customers/tabs/CustomerTabQuotations.tsx — pagination
  src/components/customers/tabs/CustomerTabOrders.tsx — pagination
  src/components/customers/tabs/CustomerTabCreditNotes.tsx — وحدة عملة
  src/pages/customers/CustomerDetailsPage.tsx — badge counts + إعادة توزيع تبويبات + تمرير props جديدة
  src/components/customers/mobile/CustomerMobileStatCard.tsx — بطاقة CLV إضافية
```

لا تعديلات على قاعدة البيانات أو Edge Functions.

