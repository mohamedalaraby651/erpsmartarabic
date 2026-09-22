# Roadmap

الفلسفة المعتمدة: **Build the product while hardening the platform** — مسارا Product Continuity وArchitecture Evolution يعملان بالتوازي.

## Current lineage
- F1: CLOSED (37/37, PASS — accepted, not certified). F2 (58 items): UNAUTHORIZED → يتحول إلى Architecture backlog محكوم بالأثر.
- Open risks: RISK-007, RISK-008, PRE-EXT-001 OPEN; PRE-TS-001 CONTAINED (recurrence #13).
- Smart Freeze ACTIVE: الدفاتر، الدفعات، حركة المخزون، المزامنة، سلطة الـtenant، الصلاحيات، RLS، الترحيلات.

## Post-F1 Findings (new lineage)
- [x] Post-F1 Findings Gate — documentation-only triage (NOTIF-001/002, DASH-001/002)
- [x] Human review of the gate — PASS / Documentation Gate Accepted
- [x] POSTF1_SCOPE_001 — human authorization granted
- [x] Unit A (NOTIF security/persistence via server-derived-tenant RPC) — implemented + evidence
- [x] Unit B (DASH data contract `paid_amount`) — implemented + evidence
- [x] Independent verification `POSTF1-VERIF-001` — PASS (certification not claimed)
- [ ] Human governance gate on POSTF1 — pending

## Track A — Product Continuity
- [x] المرحلة 2: Operational Product Audit `OPA-NAZRA-001` (مصفوفة تشغيل + backlog P0–P3)
- [x] المرحلة 3: إصلاح P1 `OPA-P1-NAZRA-001` — `/accounting` صار يوجّه لدليل الحسابات؛ `OPA-ACT-001` (صفر زر معطّل فعليًا: 28 trigger + 10 demo + 2 فُحصا يدويًا) و`OPA-GAP-001` (4 رسائل خطأ مشروعة) أُغلقا كـfalse positives موثّقة. بانتظار مراجعة بشرية.
- [x] المرحلة 4: `OPA-JRN-001` (EXECUTED/PASS — `docs/governance/OPA_JOURNEYS_RECORD.md`) — Journey Verification + Blocker Remediation (مبيعات، مشتريات، مخزون READ-ONLY، HR، مالية Read-Only). إثبات Precondition→Action→Expected State→Evidence→Recovery لكل خطوة؛ الإصلاح فقط إذا كان blocker مباشرًا
- [x] المرحلة 5: UX — التغذية الراجعة للأزرار (`OPA-UX-001`، EXECUTED/PASS — ملحق B في `docs/governance/OPA_JOURNEYS_RECORD.md`): رسالة خطأ عامة لكل عملية كتابة + `meta.successMessage` لـ33 إجراءً كان صامتًا؛ التغطية 170/176 وثلاثة استثناءات موثّقة
- [x] FIN-OBS-001: تسوية المبالغ المدفوعة للفواتير الثلاث (بتفويض، ملحق A) — مُنفَّذ بدليل، غير معتمد
- [x] `OPA-UI-001` (P0 تشغيلي، أُدرج قبل المرحلة 6): رؤوس الجداول كانت تُطرد خارج الجدول لأن `DataTableHeader` يُرجع `div` بدل خلية؛ أُصلح الجذر + خانة التحديد + التفاف زائد + محاذاة RTL منطقية + `SelectItem value=""` في 3 مواضع + إزالة التمرير المزدوج في 6 شاشات + حارس آلي `check-table-header-semantics` (ACTIVE). EXECUTED/PASS — `docs/governance/OPA_UI_001_EXECUTION_RECORD.md`
- [x] `OPA-UI-002` (تحسين واجهة بطلب المستخدم): فلاتر أعمدة متقدمة في شاشة الفواتير — رأس عمود يجمع الترتيب والتصفية، أنواع خيارات/نص/تاريخ/رقم، تحديد متعدد داخل العمود وتجميع عبر الأعمدة، فلترة على الخادم تشمل العدّ والترقيم، شريط فلاتر نشطة، وحفظ/تطبيق مجموعات مسمّاة عبر مستودع العروض المحفوظة. EXECUTED/PASS — `docs/governance/OPA_UI_002_EXECUTION_RECORD.md`
- [x] `OPA-UI-003` — **Invoice Table Interaction & Presentation Hardening** (Candidate Batch، 4 وحدات: Layout & Table Surface / Filter UX / Column Preferences / Verification): لا تجاوز أفقي للصفحة عند 360-768-1280 والتمرير داخل الجدول فقط؛ شارة الفلتر داخل الزر؛ بحث + تحديد متعدد في كل فلتر نصّي مع الحفاظ على عقد OR داخل العمود وAND بين الأعمدة؛ سحب العرض (0 طلبات شبكة) وauto-fit بقياس المحتوى ضمن 72-640px؛ كثافة + ارتفاع + رأس ثابت؛ إظهار/إخفاء/ترتيب محفوظة لكل مستخدم ولكل شاشة بلا مخطط قاعدة بيانات جديد. التعميم على الشاشات الخمس موقوف حتى قبول شاشة الفواتير. IMPLEMENTED+VERIFIED — NOT ACCEPTED — `docs/governance/OPA_UI_003_EXECUTION_RECORD.md`
- [ ] المرحلة 6: الطباعة كـworkstream مستقل (`OPA-PRN-001`)
- [ ] المرحلة 7: النسخ الاحتياطي والاسترجاع بإثبات تعافٍ (`OPA-BAK-001`)
- [ ] المرحلة 8: الأداء — قياس ثم إصلاح (`OPA-PERF-001`)
- [ ] المرحلة 9: الموبايل/PWA للرحلات الحرجة
- [ ] المرحلة 10: إتاحة الوصول وRTL ثم Design System تدريجيًا

## Track B — Architecture Evolution (بالتوازي، حسب الأثر)
- [ ] `OPA-ARC-001`: 67 ملف واجهة بوصول مباشر لقاعدة البيانات — تحويل أثناء تعديل الميزة فقط
- [ ] الحدود BND-01..04 و06..08 بأولوية المخاطر (BND-05 معتمد)
- [ ] معالجة المخاطر المفتوحة RISK-007 / RISK-008 / PRE-EXT-001

## قاعدة منع الدين الجديد
أي كود جديد: صفحة ← تطبيق ← نطاق/خدمة ← مستودع ← قاعدة بيانات، بعناصر UI قياسية وTokens وقواعد RTL. لا استدعاء قاعدة بيانات مباشر من الواجهة في كود جديد.

- [x] `OPA-TBL-001` المرحلتان 1–2: Inventory (69 سطحًا) + Contract Freeze + Canonical Interaction Kit — IMPLEMENTED/VERIFIED، NOT ACCEPTED؛ فحص التطبيق الكامل محجوب بخطأ سابق في ملف مصادقة مولّد. Pilot Wave مؤجل لكل Gate مستقل (`docs/governance/OPA_TBL_001_EXECUTION_RECORD.md`)
- [x] إصلاح بحث شاشة الفواتير المحدد: أصبح يبحث برقم الفاتورة أو اسم العميل، مع اتساق النتائج والعدد والتحديد الشامل؛ تحقق حي باسم عميل.
- [x] نقل «عرض الجدول» إلى عنوان قائمة الفواتير وتحسين وضوح قائمة التخصيص، ضمن شاشة الفواتير فقط؛ تحقق حي من المحاذاة وفتح القائمة.
- [x] تخصيص بطاقات ملخص الفواتير حسب الصلاحيات والأدوار: القيم المالية للإدارة/المحاسبة أو دور مخصص يملك عرض المدفوعات والحقول المالية، ومؤشرات تشغيلية لباقي الأدوار؛ البطاقات تصفّي القائمة تفاعليًا. تحقق حي.
- [x] نقل زر «تصدير» من رأس صفحة الفواتير إلى جوار عنوان «قائمة الفواتير»، مع عدد النتائج وفاصل بصري وتنظيم مستقل لأداة تخصيص العرض؛ تحقق بصري حي.
- [x] تحسين شريط التحديد الجمعي للفواتير: شريط أدوات مدمج بحدود خفيفة وخلفية بلورية، حالة مختصرة، وأزرار واضحة (تحديد الصفحة / كل المعروض / معاينة PDF / إلغاء التحديد)؛ تحقق بصري حي.
- [x] إعادة تصميم رأس صفحة الفواتير: عنوان علوي بأيقونة وشارة عدد، وشريط قائمة الفواتير بأيقونة وعنوان فرعي وأزرار منفصلة بصريًا (فاتورة جديدة، تصدير، تخصيص العرض)؛ تحقق بصري حي.
- [x] `OPA-INV-UX-001` المراحل 1–3 (شاشة الفواتير فقط): شريط تحديد جمعي يظهر عند التحديد فقط كشريط لاصق، ملخص مالي قابل للطي بتذكّر الحالة، شريط أدوات لاصق مع مسح بحث فوري، اختصارات لوحة مفاتيح (`/`, `N`, `R`, `Esc`, `?`) مع دليل، ولوحة نظرة سريعة للصف بدون استعلامات إضافية — IMPLEMENTED/VERIFIED، NOT ACCEPTED
- [x] `OPA-INV-UX-001` G-RETRO مطبَّق: تفضيل طي الملخص نُقل إلى `table-layout:v2:<userId>:invoices` (presentation فقط) مع تنظيف المفتاح القديم؛ Keyboard Ownership Guard (لا اختصارات داخل الحقول أو فوق الحوارات؛ Esc يغلق الأعلى أولًا)؛ Row-click contract (checkbox/روابط/أزرار لا تفتح اللوحة)؛ Search highlight نصي آمن بلا تغيير للاستعلام؛ Bulk Action Bar يحجز مساحته (112px) فلا يغطي أي محتوى
- [x] `OPA-INV-UX-001` M4 قياس أولي: أول صفوف ~1.95s، استقرار البحث ~1.6s، 25 صفًا/صفحة — لا مبرر قياسي لـvirtualization؛ لا تعديل Query Contract
- [x] `OPA-INV-UX-001` M5 إثبات عرض: صفر تمرير أفقي عند 360px و1280px، نفس السجل والإجراءات
- [ ] `OPA-INV-UX-001` Human Gates لكل مرحلة (M1–M5) — IMPLEMENTED/VERIFIED، NOT ACCEPTED؛ قرار التعميم منفصل بعد قبول OPA-UI-003

## OPA-CUST-001 — Customers Workspace (Track A)
- Status: IMPLEMENTED / VERIFIED — NOT HUMAN ACCEPTED.
- Evidence: `docs/governance/OPA-CUST-001-EXECUTION-RECORD.md`.
- Scope executed: customers list workspace UI (semantic table, column controls, search reach, shortcuts, selection invariant).
- Deferred (needs a separate authorization): Customer 360 header/summary rework, retiring `CustomerListRow`, quick-filter reset behaviour, alert filtering across unloaded pages.

## OPA-CUST-UX-002 — Customers UX remediation
- [x] M1 Correct customer stats mapping and remove presentation-derived financial indicators — IMPLEMENTED; live `farms=0` reflects the current source classification, not a UI fallback
- [x] M2 Simplify hierarchy, spacing, control sizing, RTL, and tablet behavior — IMPLEMENTED
- [x] M3 Improve table navigation, row actions, and bulk-selection scope — IMPLEMENTED
- [x] M4 Unify search/filter/column state and debounce URL search sync — IMPLEMENTED
- [x] M5 Align mobile cards, status, actions, and motion — IMPLEMENTED
- [x] M6 Improve Customer 360 presentation and dialog accessibility — IMPLEMENTED
- [ ] M7 Verification — typecheck PASS; 1634 tests PASS / 5 skipped; scoped lint 0 errors; live 360/964/1280 PASS with no page overflow. Full build remains blocked by the pre-existing generated `previewAuthStorage.ts` TS7011 error; NOT HUMAN ACCEPTED / NOT CERTIFIED
- [ ] STOP: Server-wide alert filtering needs a query contract authorization
- [ ] STOP: Infinite-offset pagination after mutations needs a separate architecture decision

## OPA-CUST-UI-004 — Customer table header and filters
- [x] Unified customer column contract with invoice-style sort/filter headers — IMPLEMENTED
- [x] Server-applied text/options/date/number column filters with active-filter chips — IMPLEMENTED
- [x] Unified toolbar, column visibility/order, density, height, resize, auto-fit, and legacy preference migration — IMPLEMENTED
- [x] Verification: typecheck PASS; 1637 tests PASS / 5 skipped; scoped lint 0 errors; production build PASS
- [ ] Live multi-viewport browser evidence was blocked by missing Chromium host libraries; NOT HUMAN ACCEPTED / NOT CERTIFIED
- [ ] STOP conditions retained: loaded-row-only bulk selection, server-wide alert filtering, and offset pagination after mutations

## OPA-CUST-UI-005 — Customer Workspace Reference Implementation
- [x] G0 — baseline and contracts recorded; unsupported customer code and sales representative deferred
- [x] Batch A — integrated stats header, advanced search, adaptive filters, multi-name/city, active filters, and recovery states — IMPLEMENTED + VERIFIED
- [ ] G1 — rerun typecheck, full tests, build, scoped lint, live RTL matrix, and performance baseline; blocker: pending execution
- [ ] Gate A — HUMAN ACCEPTANCE required before Batch B; blocker: independent human decision
- [ ] Batch B1–B3 — versioned workspace state, complete Saved Views with legacy fallback, safe URL deep links, and return-context restoration; blocker: Gate A
- [ ] Batch B4–B7 — unified preferences, desktop row keyboard navigation, compact permission-gated actions, mobile review, and bounded prefetch; blocker: Gate A
- [ ] Gate B — workflow/performance/accessibility evidence plus HUMAN ACCEPTANCE; blocker: Batch B completion
- [ ] Batch C — authority matrix and Customer 360 presentation hardening using existing read models only; blocker: Gate B
- [ ] Reference contract — document and regression-test the customer workspace pattern without rolling it out elsewhere; blocker: Batch C
- [ ] Performance decision — measure first; virtualization needs a separate architectural decision
- [ ] STOP — no DB/RLS/migrations/permissions/roles, new financial calculations, server-wide selection/alert filtering, or pagination redesign
