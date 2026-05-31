
# خطة الفحص الشامل والإصلاح — SmartERP

## الهدف
نشر وكلاء فرعيين متوازيين لاكتشاف (1) المشاكل (2) الثغرات (3) الوظائف الناقصة (4) مشاكل الجودة، ثم إصلاح الثغرات الحرجة الظاهرة الآن، وأخيراً تجميع تقرير موحّد.

---

## المرحلة 1 — إصلاح فوري للثغرات الحرجة الظاهرة (قبل أي فحص)
لأن security scan كشف 3 ثغرات حرجة، نعالجها أولاً لمنع تفاقم المخاطر:

### 1.1 ثغرة TOTP Secrets قابلة للقراءة عبر PostgREST
- **Migration**:
  - `REVOKE SELECT (secret_key, secret_encrypted, backup_codes) ON public.user_2fa_settings FROM authenticated, anon;`
  - إنشاء view آمن `user_2fa_status` يكشف فقط: `id, user_id, is_enabled, enabled_at, last_used_at, created_at`.
  - `GRANT SELECT ON public.user_2fa_status TO authenticated;`
- **Frontend**: تعديل `TwoFactorSetup.tsx` ومكونات 2FA الأخرى لتستخدم الـ view الجديد.

### 1.2 عزل Tenants في Edge Functions (4 دوال)
- إضافة `.eq('tenant_id', tenantId)` في كل استعلام service-role في:
  - `approve-expense/index.ts` → استعلام `expenses`
  - `validate-invoice/index.ts` → استعلام `customers` + `products`
  - `process-payment/index.ts` → استعلام `customers` + `invoices`
  - `stock-movement/index.ts` → استعلام `products` + `product_stock`
- استبدال `supabaseAdmin.rpc('has_role')` بـ `supabaseAuth.rpc('has_role')` ليحمل سياق المستخدم.

### 1.3 تحديث Security Findings
- استدعاء `security--manage_security_finding` بـ `mark_as_fixed` للـ 3 findings.
- تحديث `@security-memory` بالتوجيهات الجديدة.

---

## المرحلة 2 — نشر الوكلاء الفرعيين (دفعتان متوازيتان × 5 وكلاء)

### الدفعة A — الأمان والمشاكل الحرجة (`capable`)
1. **RLS & GRANT Auditor**: فحص كل جدول في `public` للتأكد من اكتمال (GRANT + RLS + Policy) لكل عملية.
2. **Edge Function Security Auditor**: فحص كل `supabase/functions/**` للتأكد من: tenant filter، JWT validation، CORS، Zod validation، idempotency.
3. **SECURITY DEFINER Auditor**: فحص كل دوال DB للتأكد من `SET search_path = public`.
4. **Runtime Error Hunter**: تحليل edge function logs (مثل `auth.unauthorized` كل 60s في `event-dispatcher`) واكتشاف الجذر.
5. **Tenant Isolation Tester**: تتبع كل استعلامات `supabase.from()` في الـ frontend وتأكيد وجود `tenant_id` filter أو RLS كافٍ.

### الدفعة B — الاكتمال والجودة (`fast`)
6. **TODO/FIXME/Stub Scout**: فحص شامل للملاحظات والـ stubs وغير المُنفّذ.
7. **Dead Buttons & Routes Scout**: التأكد أن كل `onClick`/`<Link>` متصل بمنطق فعلي.
8. **i18n & RTL Completeness Scout**: اكتشاف نصوص hardcoded بالإنجليزية وكسر RTL.
9. **Empty/Loading/Error States Scout**: تدقيق الصفحات لضمان وجود الحالات الثلاث.
10. **Edge Function Coverage Scout**: مقارنة دوال `config.toml` بالاستدعاءات الفعلية لاكتشاف اليتيمة.

---

## المرحلة 3 — تجميع التقارير
حفظ النتائج في:
```
docs/audit-reports/
├── 01-security-audit.md        (من الوكلاء 1-3)
├── 02-bugs-and-runtime.md      (من الوكلاء 4-5)
├── 03-completeness.md          (من الوكلاء 6-10)
└── 04-action-plan.md           (خطة الإصلاح المُرتّبة بالأولوية)
```

---

## المرحلة 4 — إصلاح النتائج (بعد مراجعتك)
بعد عرض التقارير عليك، نتفق على:
- **الإصلاحات الفورية** (Critical/High security)
- **الإصلاحات المؤجلة** لإصدارات لاحقة
- **العناصر المُتجاهلة** (مع توثيق السبب في security-memory)

---

## التفاصيل التقنية

| البند | الأداة | الملاحظات |
|---|---|---|
| Migration للـ 2FA | `supabase--migration` | يستلزم موافقتك قبل التنفيذ |
| تعديل Edge Functions | `code--write` / `code--line_replace` | 4 ملفات |
| الوكلاء الفرعيين | `acp_subagent--spawn_agent` | متوازي بالكامل |
| النموذج | `capable` للأمان، `fast` للباقي | لتوازن التكلفة/الدقة |
| الاختبارات | `bunx vitest run` بعد كل دفعة إصلاح | للحفاظ على 1187/1187 |

---

## نقاط قرار قبل التنفيذ

1. **هل أبدأ بالمرحلة 1 (الإصلاح الفوري) مباشرة بعد موافقتك على هذه الخطة؟**
2. **هل تريد كل الـ 10 وكلاء، أم نختصر على الدفعة A الأمنية فقط (5 وكلاء)؟**
3. **هل تريد أن أتعامل مع `auth.unauthorized` المتكرر في `event-dispatcher` كل 60 ثانية ضمن نفس الجولة؟** (يبدو من cron job يستدعي edge function بدون JWT صحيح).

---

## مخرجات نهائية متوقعة
- 3 ثغرات أمنية حرجة مُغلقة ✅
- 4 تقارير شاملة في `docs/audit-reports/`
- security-memory محدّث
- 1187/1187 tests خضراء
- قائمة أولويات إصلاح للإصدار القادم
