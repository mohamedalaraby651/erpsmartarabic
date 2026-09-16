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
- [ ] تحسين شريط التحديد الجمعي للفواتير: تصميم احترافي مدمج، أزرار واضحة، ملخص مختصر، وموضع مناسب أثناء التفاعل؛ يتطلب تحققًا بصريًا.
