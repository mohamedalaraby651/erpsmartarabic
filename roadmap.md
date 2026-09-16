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
- [ ] المرحلة 4: `OPA-JRN-001` — Journey Verification + Blocker Remediation (مبيعات، مشتريات، مخزون READ-ONLY، HR، مالية Read-Only). إثبات Precondition→Action→Expected State→Evidence→Recovery لكل خطوة؛ الإصلاح فقط إذا كان blocker مباشرًا
- [ ] المرحلة 5: UX — حالات الأزرار والتغذية الراجعة (`OPA-UX-001`)
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
