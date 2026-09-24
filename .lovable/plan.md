# OPA-CUST-UI-005 v2.0 — عقد التنفيذ النهائي لمساحة عمل العملاء

الحالة: CANDIDATE حتى الاعتماد. بعد الموافقة: AUTHORIZED لوحدة G1 فقط، وكل وحدة تالية تحتاج بوابتها الخاصة.

## الحدود الثابتة (دون تغيير)
- العملاء فقط. لا تعميم تلقائي. لا إعادة فتح F1 ولا فتح F2 تحت اسم UX.
- ممنوع: DB وRLS وmigrations وpermissions/roles وSQL/RPC جديد وقيم مالية جديدة وتغيير pagination وselect-all على مستوى الخادم وcustomer_code ومندوب المبيعات والوصول المباشر للبيانات من الواجهة.
- المسار: Page → hook/query service → repository → read model قائم.
- الحالات: IMPLEMENTED ← VERIFIED ← HUMAN ACCEPTED ← CERTIFIED. Lovable لا يعتمد عمله بنفسه.
- الأخطاء خارج النطاق: record → classify → defer.

## تسلسل الوحدات
```text
G1
 |
B0 -> B1 --+--> B2 -> B3 --+
           |               +--> Final Gate
           +--> C0 -> C1 --+
```
C0/C1 يعملان بالتوازي مع B2/B3، لكن C1 لا يدخل مرحلة القبول قبل اعتماد C0.

## قالب كل وحدة
SCOPE / FILES / ALLOWED / FORBIDDEN / INVARIANTS / ACCEPTANCE / TESTS / EVIDENCE / STOP.

---

## G1 — الإغلاق التقني للدفعة A
- ALLOWED: تشغيل التحقق فقط، وإصلاح أي regression في ملفات العملاء.
- TESTS: typecheck، كامل الاختبارات، scoped lint، build، وفحص حي RTL عند 360/768/964/1280.
- EVIDENCE: baseline لعدد الطلبات، زمن استقرار البحث والفلاتر، زمن أول صف، وعدد عناصر DOM.
- STOP: فشل TS7011 في ملف المصادقة المولّد يُسجل blocker منفصلًا ولا يُصلح هنا.

## B0 — عقد حالة مساحة العمل
- SCOPE: ملف contract جديد بدوال pure فقط.
```text
CustomerWorkspaceStateV1 { version, search, filters, columnFilters, sort, activeViewId, display }
parse() -> normalize() -> validate() -> serialize()
```
- INVARIANTS: لا `JSON.parse` داخل الصفحة. whitelist للمفاتيح والقيم، حد للطول، والحقل غير الصالح يُحذف وحده وتبقى الحقول الصالحة.
- أولوية الحالة الابتدائية: URL صالح ← Saved View النشط ← تفضيلات المستخدم ← الافتراضي. URL غير صالح لا يكسر الصفحة.
- فصل `display` (الكثافة والأعمدة) عن حالة البيانات. لا تخزين لصفوف العملاء.
- TESTS: وحدات لكل دالة، payloads قديمة، قيم خاطئة، payload كبير، round-trip.
- ACCEPTANCE: لا تغيير سلوكي ظاهر في الصفحة.

## B1 — Saved Views وURL والعودة للسياق
- Saved Views عبر جدول JSON القائم: حفظ، تطبيق، إعادة تسمية، حذف، ومنع الاسم الفارغ أو المكرر.
- View Identity: `activeViewId + activeViewSnapshot + currentState`. أي تعديل بعد التطبيق يجعل `isDirty = true` ويظهر مثلًا «المدينون • معدّل» مع خيار «حفظ التعديل» أو «حفظ كعرض جديد».
- Presets: الكل، النشطون، غير النشطين، VIP، المدينون، بنفس دلالات الفلاتر الحالية.
- Adapter للعروض القديمة دون migration.
- URL قصير versioned يحافظ على المعاملات غير الخاصة بالعملاء، ولا يتحدث مع كل حرف.
- العودة من التفاصيل: استعادة الحالة وموضع الصف المحمّل. لا إعادة بناء صفحات غير محمّلة.
- STOP: إذا كان حفظ تفضيل يحتاج عمودًا أو جدولًا جديدًا.

## B2 — لوحة المفاتيح والإجراءات والهاتف
**Keyboard ownership**
```text
input/textarea/contenteditable -> المتصفح يملك الأسهم
combobox/listbox/menu          -> المكوّن يملك الأسهم
dialog/popover                 -> الحوار يملك التنقل
table body                     -> التنقل بين الصفوف
```
- roving tabindex: الضغط على Tab يدخل الجدول مرة واحدة دون المرور على كل صف.
- المفاتيح: ↑ ↓ Home End Enter Space Escape Shift+F10. يبقى `/` للبحث، و`Ctrl/Cmd+K` يبقى للنظام العام.
- Live region لعدد النتائج وعدد المحدد.

**Action Contract** — لكل إجراء: Visibility → Permission → Handler → مسار repository قائم → Success → Error → Invalidation → Return context.

| الإجراء | المسار | القيد |
|---|---|---|
| فتح العميل | الاسم → التفاصيل → رجوع يستعيد الحالة | — |
| فاتورة | المزيد → مسار الفاتورة القائم | لا mutation مالي جديد |
| دفعة | المزيد → مسار الدفع القائم | لا سلطة دفع جديدة |
| كشف حساب | المزيد → قسم الكشف القائم | يحفظ سياق العميل |
| تعديل / واتساب | المزيد | حسب الصلاحية فقط |

- سطح المكتب: الاسم هو الإجراء الأساسي، والباقي في قائمة «المزيد» واحدة. الهاتف: يبقى السحب والضغط المطوّل، وأهداف لمس لا تقل عن 44px.

## B3 — Prefetch والأداء
- hover/focus بتأخير، إلغاء عند المغادرة، dedupe عبر الكاش، AbortSignal إذا كان المسار يدعمه، ولا prefetch على اللمس.
- KPI مقارنة بالـbaseline: requests/session، الطلبات المكررة، الطلبات الملغاة، cache hit/miss، وزمن فتح التفاصيل.
- ACCEPTANCE: يُرفض B3 إذا زادت حركة الشبكة دون فائدة قابلة للقياس.
- virtualization: قرار معماري مستقل بعد القياس فقط.

## C0 — مصفوفة مصادر Customer 360
Deliverable وثيقة تحتوي على:

| القيمة | المصدر | الدقة | Null | Error | Stale | Tenant |
|---|---|---|---|---|---|---|
| الرصيد | financial summary | منزلتان | صريح | صريح | صريح | يُثبت |
| المتأخرات | aging | منزلتان | صريح | صريح | صريح | يُثبت |
| آخر نشاط | صف العميل | حسب المصدر | صريح | صريح | صريح | يُثبت |
| كشف الحساب | statement | حسب المصدر | N/A | صريح | N/A | يُثبت |
| Health Score | health score | حسب المصدر | صريح | صريح | صريح | يُثبت |

- كل قيمة تُطابق بعينات فعلية. أي قيمة بلا مصدر موثوق تنتقل إلى STOP.

## C1 — واجهة Customer 360 (عرض فقط)
- **HARD CONSTRAINT:** ممنوع اشتقاق أي قيمة مالية من صفوف العملاء المحمّلة، أو من صفوف الفواتير والمدفوعات الموجودة في الواجهة، أو من التجميع في المتصفح، أو من cache جزئي، أو من السجلات الظاهرة بسبب pagination. المصدر الوحيد المسموح هو read model أو RPC موثوق وقائم.
- لا إعادة تفعيل `CustomerSummaryBar`. الشارات المحسوبة محليًا في التفاصيل تُسجل في المصفوفة: إما تُربط بمصدر موثوق أو تُصنّف deferred.
- حالات null/stale/error موحدة، ولا تُعرض null كصفر. تُزال ضوضاء الأيقونات لقارئ الشاشة.

## Final Gate وEvidence Pack
- لكل وحدة: diff scope، نتائج الاختبارات، لقطات شاشة للمقاسات، قياسات قبل وبعد، والمصفوفة، ثم قرار بشري.
- مخرج نهائي: Customer Workspace Regression Contract يضم State وSaved Views وURL وToolbar وKeyboard وAction وReturn Context وPerformance وAccessibility. هو عقد للتجارب القادمة، وليس نسخًا للملفات.

## Roadmap (يُحدَّث عند بدء التنفيذ)
- تُستبدل قائمة OPA-CUST-UI-005 في roadmap بالوحدات: G1، B0، B1، B2، B3، C0، C1، Final Gate، Regression Contract، مع ذكر blocker كل وحدة.

## Technical details
- الملفات المسموحة: `src/pages/customers/*` و`src/components/customers/**` و`src/hooks/customers/*` وملف contract جديد تحت `src/lib/customers/` ومستودع `savedViewsRepository` بإضافة `rename` فقط، و`customerSearchRepo` لتمرير AbortSignal فقط، والاختبارات، و`docs/governance/OPA_CUST_UI_005_*`.
- ممنوع: `supabase/**`، ملفات integrations المولّدة، مستودعات المالية/المخزون، والصلاحيات.
