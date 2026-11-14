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

## Track C — PRB-NAZRA-002 Execution (by priority)
### Current execution — approved remaining-work plan (2026-11-14)
- [x] Credit-note form experience: tenant/user-scoped seven-day local selection drafts, restore/discard, guarded close, Ctrl+S, duplicate-submit lock and inline quantity validation. Fresh invoice/returns reads on restore and submit; local price/product/availability never trusted. Seven focused tests; live restoration of a real invoice line on desktop/mobile without creating a financial document.
- [x] Goods-receipt and delivery-note list presentation: persisted table layout, pinned columns, debounced search, load-more, mobile expandable cards, explicit post/cancel confirmation with optional reason. Four confirmation tests. Live pages empty for current tenant: empty-state/mobile checks passed, populated actions covered by tests only.
- [x] Customer/supplier statement presentation: opening/closing balances derived from authoritative running balances, signed negative amounts, neutral debit/credit PDF values, Cairo default, EGP, no signature line, final page counts and print user/timestamp. Five tests plus existing 12 date-filter tests; real customer PDF downloaded and visually inspected (2 A4 landscape pages). Supplier PDF not checked live.
- [x] Expense approval denial recovery: preserve workflow code from HTTP 403 response, show Arabic refusal as a handled result rather than throwing a mutation/runtime error. Permissions unchanged. Reproduced 403 via browser interception on populated authenticated desktop/mobile; page remained visible, no page errors. Two regressions + full suite 1727 passed / 5 skipped; latest build OK.
- [x] Next continuation: goods-receipt, delivery-note and purchase-invoice draft/close/save experience; real product/quantity/notes restored in authenticated desktop/mobile checks, no posting performed. Five regression tests passed; full suite 1725 passed / 5 skipped. Evidence: `docs/governance/PRB_LOGISTICS_FORM_CONTINUATION_2026-11-14.md`.
- [x] Continuation: purchase-order and expense local drafts, guarded close and save shortcut; 7 focused tests passed, authenticated desktop restore checks and mobile form inspection passed. Full suite: 1720 passed / 5 skipped. Evidence: `docs/governance/PRB_FORM_CONTINUATION_2026-11-14.md`.
- [x] Shared configurable RTL tables + suppliers/payments/expenses/products/purchase-invoices integration and mobile expandable cards; live populated checks on four lists, purchase invoices empty-state only. Supplier load-more 25→27, sticky header and layout reload persistence verified.
- [x] Form experience integrated in payments, journals, sales orders and quotations; seven-day draft safeguards and duplicate-submit lock. Payment draft restore, close protection, Ctrl+S validation verified live without financial writes.
- [ ] Remaining report/audit generalization, statement mobile table coverage and remaining document/page actions: not completed. Credit-note, purchase-order, expense and three logistics form experiences now implemented; generalizing the entire knowledge base remains open.
- [ ] Financial reversal, discount/overdraft exceptions and rounding ledger; approval/backup confirmed, but DELETE-based payment flow must not be reused. Pending additive tenant-scoped atomic RPC implementation and integrity verification, not a new approval request.
- [x] Shared Excel export with company title/logo, extraction date and nested selected-column values; real payments workbook download/logo verified. Print-context completion remains open.
- [ ] Remaining print contexts and report/audit end-to-end checks: customer statement PDF checked live; supplier statement PDF and other print contexts still unverified.
- [x] Current verification: 1717 tests passed / 5 skipped; 35 focused tests after final form changes; latest build OK. Evidence: `docs/governance/PRB_REMAINING_WORK_EXECUTION_2026-11-14.md`.

مرجع: `docs/requirements/PRB-NAZRA-002_Interview-Decisions-Knowledge-Base.md`. كل دفعة مستقلة بقبول.
- [x] C1 أساسيات العرض (منخفض المخاطر): قواعد الجنيه (فاصل آلاف، سالب بناقص، صفر "-"، مختصر KPI) + اختبارات، تأكيد الخروج، Toast أسفل اليسار 3ث، أشرطة تمرير رفيعة
- [x] C2 (partial) جنيه في التقارير/الطباعة/صفحات التفاصيل/جدول الفواتير/بطاقات المؤشرات + زر إخفاء الأرصدة. متبقٍ: باقي الجداول وبطاقات الملخص. تعميم تنسيق المبالغ على الجداول وبطاقات KPI (استبدال المنسقات القديمة؛ PDF ما زال على SAR — يحتاج تحويل لـ EGP)
- [ ] C3 [plan approved 2026-11-14; LoadMoreFooter shared component added] (موجود جزئيًا بالفواتير: رأس مثبت، شرائح بعدادات، شريط جماعي، هياكل تحميل) متبقٍ: تعميم + تحميل المزيد + تثبيت الأعمدة. الجداول: تعميم OPA-UI-003 (كثافة/أعمدة/رأس مثبت) بعد قبول شاشة الفواتير + Chips بعدادات + تثبيت أول/آخر عمود + تحميل المزيد
- [x] C4 (فاتورة البيع) Ctrl+S، حماية المغادرة، القفز لأول خطأ، شريط استعادة المسودة (7 أيام)، شريط إجماليات بسطرين. متبقٍ: السندات والمشتريات وبطاقة العميل السريعة. نماذج المستندات: Ctrl+S/Esc، Spinner الحفظ، القفز لأول خطأ، حماية المغادرة، احتساب لحظي، شريط إجماليات بسطرين
- [ ] C5 (PARTIAL — ليست مكتملة) سلامة مالية: وافق المالك صراحةً في 2026-11-14 على قيد عكسي لإلغاء السند، طلبات موافقة المدير، وحساب فروق التقريب؛ أكد تنزيل نسخة البيانات الحالية في 00:46 UTC. تحذير البيع تحت التكلفة باقٍ ضمن نطاق الخطة المعتمدة.
  - قرار 00:48 UTC: القيد العكسي بتاريخ السند الأصلي؛ رفض الإلغاء في الفترة الأصلية المقفلة حتى اعتماد فتحها.
  - [x] طلب فتح الفترة المقفلة + موافقة المدير الذرية + منع الفتح المباشر وإعادة استخدام الموافقة؛ تحقق حي بحساب المالك على فترة اختبار فارغة أزيلت بعد التحقق، 34/34 اختبار. دليل: `docs/governance/PRB_C5_PERIOD_APPROVAL_EXECUTION.md`.
  - [ ] متبقٍ غير منفذ: عكس وإلغاء السند وربط الكشوف والإحصاءات؛ استثناء سقف الخصم وسالب الخزينة؛ حساب وقيد فروق التقريب؛ تتبع الصفر (تحذير البيع تحت التكلفة مُنفذ بفاتورة البيع مع اختبارات). لا يُعتبر تأكيد نسخة البيانات اختبار استعادة.
- [x] C6 (partial) الرصيد السابق/النهائي وتذييل تاريخ الطباعة بقالب الفاتورة. متبقٍ: تمرير الرصيد واسم المستخدم من شاشة الطباعة، Excel بترويسة. الطباعة A4: تذييل بسيط، الرصيد السابق/النهائي، إخفاء الشارات، معاينة قبل PDF، Excel بترويسة الشركة
- [x] C7 (partial) شريط تبويبات الشاشات المفتوحة + فترات سريعة بالتقارير (اليوم/الشهر/الربع/السنة). موجود سابقًا: Breadcrumbs وطي القائمة. بحث شجرة الحسابات بتوسيع وتمييز (مُنفذ). متبقٍ: ربط الإشعارات بالتبويبات. التنقل: تبويبات المهام، Breadcrumbs، مركز الإشعارات، زر إخفاء الأرصدة
- [x] C8 (partial; MobileExpandableCard component added, not yet wired to tables) ورقة سفلية لسجل العميل/المورد على الموبايل. متبقٍ: بطاقات الجداول القابلة للتوسيع. الموبايل: بطاقات قابلة للتوسيع، Bottom Sheet، شريط إجراءات سفلي
- [ ] مفتوح: قرارات 361–363 بانتظار المالك

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

## OPA-CUST-UI-005 v2.0 — Customer Workspace Execution Contract (approved 2026-09-24)
- [x] G0 + Batch A — IMPLEMENTED + VERIFIED (prior)
- [x] G1 — IMPLEMENTED + VERIFIED (docs/governance/OPA_CUST_UI_005_G1_RECORD.md); full typecheck PASS after one-line return-type annotation in generated previewAuthStorage.ts (recurrence, will return on regeneration); HUMAN ACCEPTANCE pending
- [x] B0 — CustomerWorkspaceStateV1 pure contract (parse/normalize/validate/serialize, legacy adapter, URL codecs, presets) + 10 unit tests — IMPLEMENTED + VERIFIED
- [x] B1 — full-state Saved Views (presets, rename, duplicate/empty guard, dirty «معدّل», save/save-as/undo), URL sort/cf/view, batched URL writer — IMPLEMENTED; live re-check after batching fix pending (backend was unreachable)
- [ ] B1 return-context scroll/anchor restoration after opening a customer; blocker: B1 live re-check
- [ ] B2 — keyboard ownership + action contract + mobile; blocker: B1 gate
- [ ] B3 — prefetch KPIs vs baseline; blocker: B2 gate
- [ ] C0 — Customer 360 authority matrix; blocker: B1 gate
- [ ] C1 — Customer 360 UI-only (no client aggregation); blocker: C0 acceptance
- [ ] Final Gate + Regression Contract; blocker: human acceptance
- [x] Answer user: project-level suggestions based on current state

## Nazra Knowledge OS (OPA-KOS-001)
- [x] Phase 1 — read-only knowledge browser over repo docs (admin)
- [x] OPA-KOS-002 A — Phase 1 closure (breadcrumbs, LTR lines, guard test, titles, empty state)
- [x] OPA-KOS-002 B — Phase 2 read-only: evidence mentions, impact tree, status matrix, 2 new warnings
- [ ] OPA-KOS-002 human acceptance; blocker: user review
- [ ] Skills guide (remaining Phase 2 idea); blocker: not in OPA-KOS-002 scope
- [x] Legacy test failures (~167, post-migration, unrelated to knowledge) — CLOSED by OPA-COMPLETE-001 المرحلة 1
- [ ] Phase 3 — Safe import/export; blocker: Phase 2 acceptance
- [ ] Phase 4 — Persistent storage + approval governance (DB/RLS design); blocker: explicit Smart Freeze approval

## Post-migration completion (OPA-COMPLETE-001)
- [x] المرحلة 1 — تصفير الاختبارات الفاشلة: `src/test/router-shim.tsx` + محاكاة localStorage/sessionStorage + PointerEvent/pointer-capture shims في `src/test/setup.ts` + استعادة `src/test/utils.tsx` وmocks. `bunx vitest run` → 1682 passed / 5 skipped / 0 failed. IMPLEMENTED + VERIFIED
- [x] اكتشاف وإصلاح خلل حقيقي: `src/lib/router-compat.tsx` كان يضاعف `?` في search فيكسر قراءة الفلاتر من الرابط — IMPLEMENTED + VERIFIED
- [x] المرحلة 2 — فحص توافق Edge (لا `fs`/`path`/`crypto`/`Buffer` في كود الخادم) + حجب الإدارة بحساب مبيعات (يرى «غير مصرّح بالوصول») — VERIFIED
- [x] نشر النسخة المنقولة للإنتاج بطلب المستخدم (رابط متوقع: `https://erpsmartarabic1.lovable.app`) — طلب النشر مُجدول؛ لم يُتحقق من الوصول بعد
- [x] التحقق من الرابط الحي بعد اكتمال النشر: `https://erpsmartarabic1.lovable.app` → HTTP 200، وحزمة التطبيق الحيّة (`/assets/index-DTQG4oey.js`) تحتوي كود النسخة الجديدة («المعرفة الهندسية» ×5، «مصفوفة الحالات»، `KnowledgeShell`)
- [x] تصفير الاختبارات القديمة: سطر «Legacy test failures (~167…)» أعلاه صار مغلقًا
- [ ] OPA-COMPLETE-001 المرحلة 4 — إغلاق: تحديث سجلات المعرفة + تقرير نهائي يفصل منفذ/موثّق/بانتظار قبول

## Storage hardening (مفوض من المستخدم 2026-11-13)
- [x] تقييد `restore-snapshots` و`logos` على المديرين فقط — استثناء صريح من Smart Freeze بطلب المستخدم. migration `0008_restrict_restore_snapshots_and_logos_to_admin`
  - `restore-snapshots`: حُذفت قاعدتا `no direct write/delete` (كانتا `AND false` أي رفضًا صريحًا لا يمنح شيئًا؛ الرفض الافتراضي لـRLS هو الحارس الفعلي) وأصبحت القراءة للمدير فقط بدل مدير/مالك tenant. التدفق الفعلي للنسخ والاسترجاع يمر بخدمة الخلفية فلا يتأثر.
  - `logos`: الرفع/التبديل/الحذف بقيا للمدير فقط. القراءة: أُغلق ثقب الكائنات الجذرية التي كان يقرأها أي مستخدم من أي tenant؛ صارت مربوطة بالرافع أو المدير أو نطاق الـtenant.
- [x] إعادة فحص الأمان بعد التقييد: لا ملاحظات (كانت 3 تحذيرات)
- [x] إثبات الاتجاهين: المدير يوقّع رابط شعار جذري (HTTP 200) ويسرد `restore-snapshots` (HTTP 200)؛ مستخدم المبيعات `sales@test.com` لا يوقّع الشعار الجذري (HTTP 400 / `not_found`) ولا يسرد شيئًا في `restore-snapshots` ولا في `logos` (`[]`)
- [ ] معلّق معروف: `company_settings.logo_url` مخزَّن كـرابط موقّع منتهي (HTTP 400) والشعاران الفعليان جذريّان بلا مجلد tenant — إصلاحه نقلُ ملفات إلى مجلد الـtenant وحفظ المسار لا الرابط؛ قرار منفصل

## OPA-PRN-001 — الطباعة والتصدير العربي الموحد (المسار التالي المفوض)
- [x] J0 جرد: اكتمل. 4 قوالب طباعة (فاتورة/عرض سعر/أمر بيع/أمر شراء) + كشف حسابات بـPDF فقط؛ محرّكا PDF متوازيان (jsPDF قديم + HTML v2) مع canary يغطي 4 أنواع فقط؛ 11 مسار تصدير بتكرار صريح في BOM/الخط/الشعار/الأرقام
- [x] J0-ملاحظة سابقة: الشعار في المستندات المطبوعة معطوب فعليًا — `company_settings.logo_url` يحفظ رابطًا موقّعًا منتهي الصلاحية (HTTP 400) بدل المسار، والشعاران المخزّنان في `logos` جذريّان بلا مجلد tenant فلا يقرأهما غير المدير بعد التقييد. الإصلاح: حفظ المسار + إعادة التوقيع عند العرض + نقل الملفات لمجلد الـtenant
- [x] P1 سلامة العلامة في المستندات المطبوعة: `LogoUpload` يحفظ المسار الدائم بدل الرابط الموقّع؛ `getCompanySettings()` يوقّع الشعار لكل عملية طباعة PDF؛ `useBrandingLogo` يوقّعه في معاينة الطباعة بالمتصفح؛ ملفات الشعار نُسخت إلى مجلد الـtenant و`company_settings.logo_url` صار مسارًا دائمًا
- [x] P1 إثبات حي: معاينة طباعة الفاتورة تعرض الشعار (صورة محمّلة 3464px) واسم الشركة الحقيقي «شركه اولاد الشيخ» للمدير ولمستخدم المبيعات `sales@test.com` معًا
- [x] P1 تنظيف: حُذفت 4 صفوف `company_settings` أُنشئت بالخطأ أثناء التصحيح (كلها «شركتي»، أُنشئت 15:39) وبقي صف الشركة الحقيقي الوحيد
- [!] ملاحظة معمارية: `PATCH` بلا فلتر على `company_settings` أنشأ صفوفًا بدل تحديثها — أي كتابة على هذه الجدول يجب أن تكون بفلتر `id` صريح
- [ ] P2 ما ينقص المستند المطبوع: العملة من إعدادات الشركة بدل `ج.م` الثابتة، والمدفوع/المتبقي في طباعة الفاتورة وأمر الشراء، وعنوان التسليم في طباعة أمر البيع
- [ ] P3 صحة التصدير: حلّ الأعمدة المتداخلة (`customers.name`) في تصدير القالب، خط عربي في PDF دليل العملاء، وتصدير المستخدمين يحترم الفلاتر الحالية
- [ ] J1 عقد موحّد: طبقة rendering واحدة (RTL + أرقام + عملة) بلا منطق مالي جديد
- [ ] J2 توحيد المخرجات: PDF/CSV/Excel عبر مسار واحد
- [ ] J3 بوابات: typecheck + اختبارات + إثبات حي عند 1280 و390
- [ ] Human Gate — قبول المستخدم

## PRB-BASELINE-001 — Requirements-to-Repository Traceability
- [x] ربط كل متطلب في PRB-NAZRA-001 بوحدة/شاشة/Workflow، تصنيفه (موجود/جزئي/مفقود/غير متحقق/يحتاج قرارًا) مع الأدلة، الفجوات الحرجة، وExecution Queue. جرد فقط بلا تغيير DB أو منطق.
- [ ] الخطوة التالية من Execution Queue: VERIFY-001 ثم قرارات OD-03/04/05/09 (بانتظار المستخدم)

## مقابلة متطلبات المشروع — قرارات المستخدم
- [x] توثيق أولوية سلامة الحسابات، وتجاوز الائتمان بموافقة مخوّل، والمخزون السالب كاستثناء موثق بموافقة مسؤول مع متابعة التسوية؛ متطلبات مؤكدة وليست إثبات تنفيذ.
- [x] عرض مثال افتراضي للمقارنة بين المتوسط المرجح المتحرك وFIFO قبل حسم OD-04.
- [x] حسم طريقة التقييم: المتوسط المرجح المتحرك؛ وتخويل تجاوز الائتمان لأشخاص يحددهم المستخدم لكل شركة، لا لكل أصحاب الدور؛ توثيق فقط.
- [x] توثيق تأجيل تطوير الضرائب والفاتورة الإلكترونية حاليًا؛ دون إلغاء الموجود.
- [x] توثيق هدف عدم فقد أي عملية (RPO=0) وتخويل استثناء المخزون لأشخاص يحددهم المستخدم لكل شركة؛ متطلبات فقط، لا ضمان استعادة أو تعديل صلاحيات.
- [x] توثيق اختيار شاشة البداية لكل مستخدم؛ متطلب فقط دون تغيير التطبيق.
- [x] توثيق نطاق دون اتصال: عرض محفوظ، مسودات بيع/شراء، تسجيل تحصيلات وحركات مخزون للمزامنة؛ الأخيران ليسا اعتمادًا نهائيًا دون اتصال.
- [ ] مقارنة تكلفة وإمكانية خيارات الاستعادة قبل اختيار مدة التعافي، بطلب المستخدم؛ مع هدف RPO=0، فالنسخ اليومية وحدها لا تحققه، ومدة التعافي والاحتفاظ لم تُحسم.
- [x] عرض مثال افتراضي لتصحيح الفرق أو عكس فاتورة مُرحّلة وإعادة إصدارها؛ دون تغيير البيانات.
- [x] حسم آلية التصحيح: عكس وإعادة إصدار بموافقة مع حفظ الأصل وتتبع التحصيلات ومنع تكرارها؛ توثيق فقط.
- [ ] استكمال OD-06: هوية المخوّلين وتاريخ قيد العكس وقواعد الفترات التاريخية؛ بانتظار قرارات المستخدم.
- [x] توثيق أن السماح بتعدد الأدوار يحدده اختيار كل شركة؛ دون تعديل الصلاحيات.
- [x] توثيق مراجعة تعارضات المزامنة بواسطة أشخاص يحددهم المستخدم، مع تعليق العملية دون استبدال تلقائي للبيانات المعتمدة؛ وتحديد فروع مسموحة لكل مستخدم، دون تنفيذ.
- [x] توثيق فصل صلاحيات رؤية المخازن عن صلاحيات العمليات عليها؛ متطلب فقط.
- [x] توثيق قوائم الأسعار والاتفاقات معًا، وحدود الخصم لكل موظف والتجاوز بموافقة مخوّل؛ دون تغيير الأسعار أو الصلاحيات.
- [x] توثيق السماح بتسليم طلب العميل على دفعات مع تتبع الكميات المتبقية؛ متطلب فقط دون تنفيذ.
- [x] توثيق طلب الشراء الداخلي وأمر الشراء المباشر كمسارين بحسب الصلاحية؛ دون افتراض إعفاء من الموافقات أو تنفيذ تغييرات.
- [x] توثيق أولوية اتفاق السعر الساري، وخيارات فوترة الدفعات حسب الصلاحية، ووحدات التحويل الثابت والمتغير، وتتبع الكميات والألوان والمقاسات؛ متطلبات فقط.
- [x] توثيق اقتراح توزيع التحصيل ثم تأكيد الموظف، وتسجيل النقدي والتحويل البنكي والمحافظ والبطاقات؛ دون افتراض معيار توزيع أو ربط إلكتروني أو تعديل التطبيق.
- [x] توثيق خيارات تسوية مرتجع العميل: تخفيض المديونية، رد مبلغ بموافقة، واستبدال ببضاعة أخرى؛ دون افتراض تفاصيل التسوية أو تغيير التطبيق.
- [x] توثيق تسوية فروق الجرد بموافقة موثّقة بعد تسجيل الفرق وسببه؛ دون تعديل المخزون أو الحسابات.
- [x] توثيق أن مخوّلي تسوية الجرد أشخاص يحددهم المستخدم لكل شركة، ومنع التسجيل في الفترة المقفلة قبل إعادة فتحها بموافقة موثّقة؛ متطلبات فقط دون تنفيذ.
- [x] توثيق أولوية مراجعة أرصدة العملاء والموردين والخزينة والبنوك؛ دون إلغاء التقارير الأخرى أو ادعاء التحقق من أرقامها.
