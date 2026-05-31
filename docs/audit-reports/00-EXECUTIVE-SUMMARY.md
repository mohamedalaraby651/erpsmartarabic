# تقرير الفحص الشامل — SmartERP / Nazra
> تاريخ: 2026-05-31 — أعدّه: 9 وكلاء فحص متوازيين

## 1. الإصلاحات الفورية المُنفّذة ✅
| # | الإصلاح | الحالة |
|---|---|---|
| 1 | حجب أعمدة 2FA الحساسة (`secret_key`, `secret_encrypted`, `backup_codes`) عن `anon`/`authenticated`/`PUBLIC` | ✅ Migration طُبّقت |
| 2 | إضافة `.eq('tenant_id', tenantId)` في `approve-expense` (expenses, cash_registers) | ✅ |
| 3 | إضافة tenant filter في `validate-invoice` (customers, products) | ✅ |
| 4 | إضافة tenant filter في `process-payment` (customers, invoices) | ✅ |
| 5 | إضافة tenant filter في `stock-movement` (products, product_stock) + tenant_id في INSERTs | ✅ |
| 6 | إغلاق 3 ثغرات في security scanner | ✅ |

## 2. التقارير التفصيلية (في `docs/audit-reports/`)

| الملف | الموضوع | أبرز ما فيه |
|---|---|---|
| `01c-security-definer-audit.md` | تدقيق 132 دالة DB | 🔴 **5 ثغرات حرجة** (`decrypt_totp_secret`, `atomic_*_balance_update` × 2, `switch_user_tenant`, `merge_customers_atomic`) — 🟠 8 high (دوال dispatcher مفتوحة لأي JWT) |
| `02a-auth-loop-rca.md` | السبب الجذري لخطأ `auth.unauthorized` كل 60s | جدولة في Supabase Dashboard تستدعي `event-dispatcher` بـ anon key بدون `x-dispatcher-secret` header — يحتاج إصلاح يدوي في الـ Dashboard |
| `03a-dead-buttons-routes.md` | أزرار/روابط ميتة في الواجهة | جاهز للمراجعة |
| `03b-todos-stubs.md` | TODOs/FIXMEs/stubs | مصنّفة حرج/وظيفي/تجميلي |
| `03c-i18n-rtl-audit.md` | اكتمال الترجمة و RTL | عينات من الكسر |
| `03d-states-audit.md` | Loading/Empty/Error states | صفحات تفتقد للحالات |
| `03e-edge-function-coverage.md` | دوال يتيمة وغير مستخدمة | للحذف أو التوصيل |

## 3. الإصلاحات الحرجة القادمة (موصى بها فوراً)

### 3.1 من `01c-security-definer-audit.md`
- 🔴 **`decrypt_totp_secret`**: أي مستخدم يقرأ سر أي مستخدم آخر → `REVOKE EXECUTE FROM PUBLIC, authenticated` + استدعاء حصري من `verify-totp`.
- 🔴 **`atomic_customer_balance_update` / `atomic_supplier_balance_update`**: لا تحقق tenant → إضافة `WHERE tenant_id = current_tenant_id()`.
- 🔴 **`switch_user_tenant`**: يسمح بتغيير tenant لأي مستخدم → إضافة `IF auth.uid() <> _user_id THEN RAISE EXCEPTION`.
- 🔴 **`merge_customers_atomic`**: لا تحقق أن العميلين في نفس tenant.

### 3.2 من `02a-auth-loop-rca.md`
- ⚠️ يتطلب تدخل يدوي من المستخدم في **Supabase Dashboard → Edge Functions → event-dispatcher → Schedules**: إضافة header `x-dispatcher-secret`.

## 4. الإصلاحات المؤجّلة (تحتاج موافقتك)
- ~30 دالة dispatcher/telemetry تحتاج `REVOKE EXECUTE FROM authenticated` (high).
- دوال `create_journal_for_*` تحتاج فحص `auth.uid() IS NOT NULL`.
- نتائج الواجهة (dead buttons / TODOs / RTL / empty states) — يحتاج جولة إصلاح منفصلة.

## 5. التقارير المتأخرة
- `01a-rls-grant-audit.md` (RLS & GRANT) — لم يكتمل بعد
- `01b-edge-function-security.md` — لم يكتمل بعد

---

## 6. الخطوات التالية المقترحة
1. **موافقتك على Migration التالي** لإصلاح الـ 5 ثغرات الحرجة في 01c (سأكتبه فور موافقتك).
2. **يدويًا**: تعديل جدولة `event-dispatcher` في Dashboard لإضافة secret header.
3. مراجعة تقارير الواجهة (03a-03e) وتحديد ما تريد إصلاحه في جولة قادمة.
