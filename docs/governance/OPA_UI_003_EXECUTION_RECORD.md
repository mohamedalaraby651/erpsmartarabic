# OPA-UI-003 — Invoice Table Interaction & Presentation Hardening

الحالة: **IMPLEMENTED + VERIFIED (Runtime Evidence) — NOT ACCEPTED / NOT CERTIFIED**
الطبقة: Product / UI Interaction Scope مستقل. Smart Freeze محترم.
الوحدات: A (Layout & Table Surface) · B (Filter UX) · C (Column Preferences) · D (Verification).

---

## 1. Scope

| البند | التصنيف | القرار | الحالة |
|---|---|---|---|
| DSP-001..008 | UI / Presentation | داخل النطاق | منفَّذ |
| FLT-001 | UI + Application query behavior (بلا تغيير قواعد أعمال) | داخل النطاق | منفَّذ |
| COL-001 | UI state + persistence | داخل النطاق | منفَّذ |
| COL-002 | UI state / layout | داخل النطاق | منفَّذ |
| COL-003 | UI state + per-user/per-screen preferences | داخل النطاق | منفَّذ |
| تعميم النمط على 5 شاشات | مؤجَّل | لا يُنفَّذ قبل قبول شاشة الفواتير | **لم يُنفَّذ (محترم)** |
| RLS / migrations / financial logic | Security / Domain | ممنوع | لم يُمس |
| F2 remediation · إعادة بناء table/query architecture | Architecture | ممنوع | لم يُنفَّذ |

**صياغة FLT-001 المعتمدة:** توسيع واجهة وآلية استخدام الفلاتر القائمة مع الحفاظ على العقد الحالي — OR داخل العمود، AND بين الأعمدة، ولا تغيير في مصدر الحقيقة أو قواعد الأعمال.

## 2. Frozen files (لم تُمس)

`supabase/migrations/**` · سياسات RLS · `src/integrations/supabase/client.ts` · `types.ts` · دوال الترحيل والقيد المحاسبي · منطق المدفوعات والمخزون · مستودعات المجال المالي. لا repository جديد ولا Query Service جديد أُنشئ لأجل الواجهة.

## 3. Baseline (قبل التنفيذ)

- الشريط الجانبي الثابت يغطي العنوان والبطاقات (`mr-18` / `mr-65` غير موجودة في مقياس Tailwind ⇒ بلا أثر).
- تمرير أفقي على مستوى الصفحة، وسطر الترقيم مقصوص.
- شارة عدد الفلاتر تُرسم خارج زر الفلتر.
- فلاتر النص: إدخال حر فقط، لا بحث في القيم ولا تحديد متعدد.
- عرض الأعمدة تلقائي، لا كثافة، لا إظهار/إخفاء، لا ترتيب، لا رأس ثابت.

## 4. Implemented changes

**Unit A — Layout & Table Surface**
- `src/components/layout/AdaptiveShell.tsx`: `lg:mr-[70px]` / `lg:mr-[280px]` + `min-w-0 overflow-x-hidden`.
- `src/components/platform/PlatformLayout.tsx`: `mr-[280px] min-w-0 overflow-x-hidden`.
- `InvoicesPage.tsx`: حاوية جدول `overflow-auto` مع إطار — التمرير الأفقي داخل الجدول فقط؛ رأس ثابت `sticky top-0`؛ خلايا `truncate whitespace-nowrap`؛ `tabular-nums` للأعمدة الرقمية؛ صف أدوات واحد موحّد المسافات. كل الألوان عبر رموز النظام (`bg-card`, `border-border`, `text-success`, `text-destructive`) — لا ألوان ثابتة.

**Unit B — Filter UX**
- `src/components/ui/column-filter.tsx`: الشارة داخل `PopoverTrigger`؛ فلتر النص = بحث حر + قائمة القيم الموجودة بتحديد متعدد وحالة تحميل؛ `isFilterActive`/`describeFilter` تراعي القيم المختارة.
- `src/lib/filters/applyColumnFilters.ts`: القيم المختارة لها الأولوية على النص الحر → `eq` لقيمة واحدة و`in` لأكثر (OR داخل العمود)؛ الأعمدة تُركَّب بـAND كما كان.
- `src/hooks/invoices/useInvoicesList.ts`: قائمتا قيم قراءةً فقط (أسماء العملاء، أرقام الفواتير؛ حد 500، `staleTime` 5د). لا تغيير في عقد الاستعلام أو مصدر الحقيقة.

**Unit C — Column Preferences**
- `src/hooks/useTableLayout.ts`: نموذج التفضيل `user + screen → { widths, hidden, order, density, bodyHeight }`، مفتاح `table-layout:<userId>:<screen>`؛ تبديل الحساب لا يرث تفضيلات غيره؛ لا جداول ولا مخطط قاعدة بيانات جديد.
- `measureColumnWidth()` في `column-filter.tsx`: النقر المزدوج يقيس محتوى الرأس وخلايا العمود فعليًا ضمن الحدود 72–640px.
- `src/components/table/TableViewOptions.tsx`: كثافة (مريح/متوسط/مضغوط)، ارتفاع منطقة الجدول، إظهار/إخفاء، إعادة ترتيب، استعادة الافتراضي.

## 5. Verification commands

```
npx tsgo --noEmit -p tsconfig.app.json          # 0 أخطاء
node scripts/fitness/run-all.mjs                # active=34 pending=9 failures=0
npx vitest run src/lib/filters                  # 6/6
python3 /tmp/browser/uic3/verify.py             # 360 / 768 / 1280
python3 /tmp/browser/uic3/behavior.py           # resize · persistence · filters
```

## 6–8. أدلة العرض (scrollWidth مقابل clientWidth على جذر الصفحة)

| العرض | documentElement | body | نتيجة | حاوية الجدول | الترقيم ظاهر |
|---|---|---|---|---|---|
| 360px | 360 / 360 | 360 / 360 | لا تجاوز | عرض بطاقات (لا جدول) | نعم |
| 768px | 768 / 768 | 768 / 768 | لا تجاوز | `overflow-x: auto` — 1436 داخل 696 | نعم |
| 1280px | 1280 / 1280 | 1280 / 1280 | لا تجاوز | `overflow-x: auto` — 1436 داخل 1110 | نعم |

الشريط الجانبي لا يغطي المحتوى في الأحجام الثلاثة. لقطات: `/tmp/browser/uic3/v360.png`, `v768.png`, `v1280.png`.

## 9. Filter test matrix

| الحالة | النتيجة |
|---|---|
| بحث داخل العميل | 13 قيمة معروضة، بحث فوري |
| بحث داخل رقم الفاتورة | قائمة القيم + بحث حر |
| بحث داخل الحالة | يعمل (OPA-UI-002) |
| تحديد عميلين معًا | 22 صفًا ← 4، العدّاد والترقيم 4 |
| نطاق رقمي (الإجمالي ≥ 50,000) | 5 صفوف، «عرض 1–5 من 5»، صفحة 1/1 |
| نطاق تاريخ (فترات جاهزة + من/إلى) | يعمل |
| OR داخل العمود | `in(...)` — اختبار وحدة + دليل حي |
| AND بين الأعمدة | محفوظ كما في العقد السابق |
| العدّ على الخادم | متسق مع الصفوف والترقيم |

## 10. Column preference persistence test

- مفتاح مخزَّن فعليًا: `table-layout:faba39d3-…:invoices` → `{ widths:{total_amount:218}, hidden:["remaining"], order:[…], density:"compact", bodyHeight:0 }`.
- بعد إعادة تحميل الصفحة: العرض 218 باقٍ كما هو.
- النقر المزدوج (auto-fit) قاس المحتوى وأعطى 252 ضمن الحدود.
- إعادة الترتيب انعكست على رؤوس الجدول فعليًا (حالة الاعتماد قبل حالة الدفع)، وإخفاء «المتبقي» أزال العمود.
- المفتاح مقيَّد بالمستخدم والشاشة ⇒ تغيير أعمدة الفواتير لا يمس أوامر البيع.

## 11. Regression results

| البند | النتيجة |
|---|---|
| **REST requests أثناء السحب** | **0** — السحب حالة واجهة محضة، لا إبطال استعلام ولا جلب |
| business rules | بلا تغيير |
| migrations / RLS / permissions | بلا تغيير |
| financial calculations | بلا تغيير |
| F1 reopening / F2 work | لا شيء |
| repository / Query Service جديد | لا شيء |

## 12. Fitness

`active=34 · pending=9 · failures=0` (شامل حارس `check-table-header-semantics`).

## 13. Typecheck

`tsgo --noEmit -p tsconfig.app.json` → 0 أخطاء. (أُصلح أيضًا تكرار `previewAuthStorage.ts` — PRE-TS-001 DELTA #16، محتوًى.)

## 14. Out-of-scope findings

- `src/ui/**` لا تزال تحمل ملاحظات pending في الـfitness (canonicalState / className) — سجلّها الخاص، لا تُعالَج هنا.
- `remaining` عمود مشتق (الإجمالي − المدفوع) ⇒ لا فلترة على الخادم له.
- تعميم النمط على أوامر البيع/عروض الأسعار/أوامر الشراء/المنتجات/المدفوعات: موقوف حتى قبول شاشة الفواتير.

## 15. Known limitations

- قوائم قيم الفلاتر محدودة بـ500 قيمة لكل عمود (البحث الحر يغطي ما بعدها).
- التفضيلات مخزَّنة في `localStorage` (لكل مستخدم/شاشة) لا في قاعدة البيانات ⇒ لا تنتقل بين الأجهزة. مجموعات الفلاتر المسمّاة فقط هي المخزَّنة في saved views.
- عرض 360px يستخدم البطاقات، فبنود تخصيص الأعمدة لا تنطبق عليه.

## 16. Human gate

**Implemented ≠ Verified ≠ Accepted/Certified.**
هذه الدفعة **Candidate Batch** بأدلة تشغيل حية؛ القبول والترخيص بالتعميم قرار بشري صريح.
