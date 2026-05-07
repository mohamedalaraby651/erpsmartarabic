
# تحسينات صفحة العميل (موبايل) — اقتراحات وإصلاحات

من فحص الصورة والكود (`CustomerMobileProfile`, `CustomerIconStrip`, `CustomerDetailsPage`)، رصدت عدة مشاكل وفرص تحسين. أدناه مقترح متماسك بدون كسر للواجهة الحالية.

## مشاكل رصدتها

1. **فراغ ضخم تحت الـ IconStrip** عند `mobileSection === 'none'`: الشاشة شبه فارغة بعد KPI، يضيع موضع المستخدم.
2. **بطاقة "الرصيد/المستحق"** بلون أحمر دائمًا حتى لو الرصيد صفر/دائن — مضلل بصريًا.
3. **شريط الأيقونات (11 أيقونة)** يُجبر على التمرير الأفقي بدون إشارة لذلك (لا سهم/ظل) — كثير من المستخدمين لا يكتشفون باقي الأقسام.
4. **شارة "ممتاز 100/100"** فوق رأس البطاقة منفصلة بصريًا عن الـ Hero — تبدو طافية وغير مرتبطة.
5. **زر "تواصل ×"** الأخضر العلوي (Smart Alerts/last activity chip) مكرر مع زر الاتصال بالأسفل.
6. **استخدام ألوان tailwind مباشرة** (`text-blue-600`, `bg-emerald-100`...) في `CustomerIconStrip` و`CustomerMobileProfile` بدلاً من tokens دلالية — يخالف Core memory.
7. **لا يوجد Empty State** بديل عند `'none'` يقترح أكثر القسم استخدامًا (فواتير/كشف/تذكيرات).
8. **زر "إشعار دائن"** في sheet الإجراءات يفتح قسم الفواتير فقط — إجراء مضلل (لا ينشئ إشعار فعليًا).
9. **حد الائتمان** يُعرض كـ progress bar بدون قيمة الرصيد المتبقي (المتاح للسحب) — معلومة مفقودة مهمة.
10. **عدم تمييز overdue invoices** في ملخص KPI الموبايل (الشارة موجودة على أيقونة "فواتير" فقط).
11. **CustomerCompressedHeader** يظهر بكامل ارتفاعه (max-h-40) فيغطي محتوى عند التمرير على الموبايل.
12. **زر «نشط/غير نشط»** صغير جدًا (h ≈ 18px) أقل من 44px — مخالف لمعيار اللمس.

## الخطة

### 1) إصلاح بصري سريع (بدون breaking)
- استبدال الألوان المباشرة بـ semantic tokens (`primary`, `success`, `warning`, `destructive`, `muted`) في `CustomerIconStrip` + KPI Cards.
- توحيد بطاقة الرصيد: لون `success` لو دائن/صفر، `warning` لو 0–60% من حد الائتمان، `destructive` فقط لو تجاوز.
- تكبير زر "نشط/غير نشط" إلى `min-h-[28px]` ووضعه ضمن صف flex ملموس، أو نقله بجانب الشارة الذهبية (Crown).
- إضافة ظل تدرجي يسار/يمين على `ScrollArea` الـ IconStrip ليُوحي بإمكانية السحب الأفقي.

### 2) Empty State ذكي عند `'none'`
بدل الفراغ، عرض بطاقة "اقتراحات سريعة" تحوي 3 أزرار كبيرة:
- "آخر 3 فواتير" (يفتح قسم invoices)
- "كشف الحساب" (يفتح statement)
- "تذكيرات قادمة" (يفتح reminders) — مع badge عدد التذكيرات اليوم/الأسبوع.
هذا يقلّل عدد النقرات للوصول لأكثر الإجراءات تكرارًا.

### 3) معلومات حد الائتمان
- إضافة سطر تحت progress bar: «المتاح للسحب: X ج.م» (creditLimit − currentBalance، مع `Math.round(v*100)/100`).
- إخفاء البطاقة كاملة لو `creditLimit === 0` (بدلًا من إظهار 0%).

### 4) شارات Overdue ضمن KPI
- داخل `CustomerKPICards` (الموبايل compact): لو `overdueCount > 0` نضيف badge صغير `+N متأخرة` أعلى رقم "المستحق" بلون `destructive`.
- يستخدم نفس الحساب الموجود حاليًا في `sectionBadges`.

### 5) إصلاح زر "إشعار دائن"
- تغيير `onNewCreditNote` ليفتح فعليًا dialog `CreditNoteFormDialog` مع `prefillCustomerId` (نمط مماثل لـ `onNewPayment` → `/payments`).
- بديلًا أبسط: تمرير `() => navigate('/credit-notes', { state: { prefillCustomerId } })`.

### 6) تنظيف الـ Hero
- دمج شارة "ممتاز 100/100" مع صف الحالة (نشط) في صف واحد متناسق.
- إزالة chip "تواصل ×" المكرر، أو تحويله لـ Toast/Toggle داخل Smart Alerts فقط.

### 7) IconStrip
- تحويل التنقل إلى `aria-orientation="horizontal"` وإضافة Home/End keys.
- إعادة ترتيب الأقسام حسب التكرار: `invoices, payments, statement, reminders, sales, analytics, aging, communications, notes, info, attachments`.
- زر "المزيد" في النهاية يعرض الأقل استخدامًا في popover (لتقليل الصف لـ 6 أيقونات افتراضًا).

### 8) Compressed Header
- خفض `max-h-40` إلى `max-h-16` وإظهار اسم العميل + رصيد + زرّي إجراء فقط (Phone, Invoice).
- استخدام `backdrop-blur` + شفافية بدل الخلفية الصلبة.

## ملفات ستُعدَّل

```text
src/components/customers/mobile/CustomerIconStrip.tsx     (semantic tokens, scroll hints, More popover)
src/components/customers/mobile/CustomerMobileProfile.tsx (status chip, credit usage line, hero merge)
src/components/customers/mobile/CustomerCompressedHeader.tsx (شريط مضغوط حقيقي)
src/components/customers/details/CustomerKPICards.tsx     (overdue badge في compact)
src/pages/customers/CustomerDetailsPage.tsx               (empty state ذكي + onNewCreditNote حقيقي + إعادة ترتيب)
```

## نقاط للنقاش (اختياري)

- هل تريدني أبدأ بكل التحسينات معًا، أم على دفعات (1+2+3 أولًا، ثم الباقي)؟
- زر "إشعار دائن": نفتح dialog أم ننتقل لصفحة `/credit-notes`؟
- تقليل أيقونات الـ Strip لـ 6 + "المزيد"، أم نُبقي الـ 11 ونُحسّن مؤشر التمرير فقط؟

عند موافقتك أبدأ التنفيذ خطوة خطوة مع QA بصري لكل تغيير.
