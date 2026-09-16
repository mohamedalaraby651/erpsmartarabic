# POSTF1_SCOPE_001 — Independent Verification (PHASE 1)

- ID: `POSTF1-VERIF-001`
- النوع: تحقق مستقل بلا تعديل مصدر (verification-only)
- الحكم: **PASS** — (ليس Certification؛ الاعتماد قرار حوكمة بشري منفصل)

## Unit A — الإشعارات

| # | التحقق | الدليل الحي | النتيجة |
|---|---|---|---|
| V1 | الدالة موجودة بتوقيع العقد | `pg_proc.proname = create_tenant_notification(target_user_id uuid, title text, message text, notification_type text, link text)` | PASS |
| V2 | SECURITY DEFINER | `prosecdef = true` | PASS |
| V3 | search_path مثبّت | `proconfig = {search_path=public}` | PASS |
| V4 | tenant مشتق من الخادم | جسم الدالة: `_tenant := public.get_current_tenant()` ولا يُمرَّر من العميل | PASS |
| V5 | منع الانتحال داخل نفس الـtenant | شرط العضوية في `user_tenants` وإلا `42501` | PASS |
| V6 | رفض غير المصادَق / بلا tenant | `auth.uid() IS NULL` و`_tenant IS NULL` ⇒ `42501` | PASS |
| V7 | منع الإدراج المباشر | `has_table_privilege('authenticated','notifications','INSERT') = false`، و`anon` = false | PASS |
| V8 | صلاحية التنفيذ محصورة | `authenticated` = true، `anon` = false | PASS |
| V9 | القراءة/التحديث للمستخدم سليمة | `SELECT` = true، `UPDATE` = true لـ`authenticated` | PASS |
| V10 | خدمة الخلفية تعمل | `service_role` INSERT = true | PASS |

## Unit B — الفواتير الأخيرة

| # | التحقق | الدليل | النتيجة |
|---|---|---|---|
| V11 | لا وجود للحقل الخاطئ | `rg "amount_paid" src/` ⇒ صفر نتائج | PASS |
| V12 | استعمال الحقل الصحيح | `useDashboardData.ts` يختار `paid_amount`، و`RecentInvoicesWidget.tsx` يعرضه | PASS |

## فحوص الجودة

- فحص الأنواع: `verdict=PASS` — total=2 platform=2 project=0 (PRE-TS-001 محتوى، منصّي).
- Fitness: `active=33 pending=9 failures=0`.

## تحقق سلبي

لا تعديل على F2، ولا على RLS/الترحيلات/سلطة الـtenant/الصلاحيات/المالية/النطاق خلال هذا التحقق. المخاطر RISK-007 / RISK-008 / PRE-EXT-001 تبقى مفتوحة؛ PRE-TS-001 محتوى كـDELTA.
