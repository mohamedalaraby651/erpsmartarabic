# تقرير تقوية الأمان — ERP Smart Arabic / Nazra
> Phase 3 deliverable. مرتبط بـ `architecture-hardening-audit.md`.

## 1. النموذج الأمني الحالي
- **Multi-tenant** عبر `tenant_id` + RPC `current_tenant_id()` في كل سياسة RLS.
- **Roles**: `app_role` enum + `user_roles` table + `has_role()` SECURITY DEFINER.
- **Custom Roles**: `custom_roles` + `role_section_permissions` + `role_field_permissions` + `role_limits`.
- **RPCs الحرجة**: `check_section_permission`, `check_financial_limit`.
- **2FA**: TOTP عبر Edge Function `verify-totp`.

## 2. الفجوات المُكتشفة وخطة الإصلاح

### 2.1 [Critical] غياب Idempotency للعمليات المالية
**الخطر**: تكرار `process-payment`, `approve-invoice`, `restore-backup`, `create-journal` ينتج postings/payments مكررة عند:
- إعادة محاولة الشبكة من العميل.
- مزامنة طابور offline.
- هجوم replay متعمد.

**الحل**:
1. جدول `operation_idempotency`:
   ```sql
   CREATE TABLE public.operation_idempotency (
     idempotency_key text NOT NULL,
     tenant_id uuid NOT NULL,
     user_id uuid NOT NULL,
     operation text NOT NULL,
     request_hash text NOT NULL,
     response jsonb,
     status text NOT NULL DEFAULT 'pending',
     created_at timestamptz DEFAULT now(),
     completed_at timestamptz,
     PRIMARY KEY (tenant_id, idempotency_key)
   );
   ```
2. كل Edge Function مالية تقرأ `Idempotency-Key` header (UUID v4) وتفحص الجدول قبل التنفيذ.
3. إذا `status='completed'` → إرجاع الاستجابة المخزنة (200).
4. إذا `status='pending'` و عمر السجل < 30s → 409 Conflict.
5. تنظيف دوري عبر `pg_cron` لسجلات > 7 أيام.

### 2.2 [High] Correlation ID غير موحّد
**الخطر**: تتبع الأخطاء عبر الواجهة → edge → DB غير ممكن.
**الحل**: 
- توليد `crypto.randomUUID()` في كل طلب من الواجهة وإرساله كـ header `x-correlation-id`.
- Edge functions تُمرّره لـ `activity_logs.correlation_id` (إضافة عمود).
- Logger الواجهة يستهلك نفس القيمة.

### 2.3 [High] Frontend-only Permission Checks
**الخطر**: `hasPermission()` المحلي قابل للتلاعب.
**القاعدة**: للعمليات الحساسة (delete/approve/post) **يجب** استدعاء `verifyPermissionOnServer()` قبل أي mutation. الـ DB يبقى المرجع النهائي عبر RLS.
**الإجراء**: مراجعة 50 ملفًا فيه `hasPermission` + ضمان وجود فحص خادم خلفه.

### 2.4 [Medium] SECURITY DEFINER بدون search_path
**القاعدة الإلزامية**: كل دالة `SECURITY DEFINER` يجب:
```sql
LANGUAGE sql/plpgsql
SECURITY DEFINER
SET search_path = public
```
**الإجراء**: تشغيل `supabase--linter` بعد كل migration → معالجة كل تحذير `function_search_path_mutable`.

### 2.5 [Medium] CORS / JWT في Edge Functions
**التحقق المطلوب لكل دالة**:
- `corsHeaders` موجود في كل response (نجاح وخطأ).
- لو `verify_jwt = false` في `config.toml` → فحص JWT in-code عبر `getClaims()`.
- Body validation بـ Zod أو فحص يدوي صارم.

### 2.6 [Medium] Bulk Operations Authorization
موجود [Bulk Authorization memory] — فحص أن **كل** RPC `*_bulk_*` يستدعي `check_section_permission` داخليًا.

### 2.7 [Low] Rate Limiting
موجود (Token Bucket) — تأكيد تطبيقه على edge functions الحساسة (login attempts, restore-backup).

## 3. Anti-Replay Protection — تفصيل
| العملية | المفتاح المقترح | السلوك عند التكرار |
|---|---|---|
| `process-payment` | client UUID v4 | إرجاع نفس payment_id |
| `approve-invoice` | invoice_id + 'approve' + version | 409 إذا تغيّر invoice |
| `create-journal` | source_doc_type + source_doc_id | 409 |
| `restore-backup` | upload SHA-256 | 409 |
| `merge-customers` | sorted(ids) hash | 409 |

## 4. Audit Logging
- `activity_logs` موجود — إضافة:
  - `correlation_id uuid`
  - `idempotency_key text`
  - `client_ip inet` (من `x-forwarded-for`)
- Trigger يرفض حذف صفوف `activity_logs` (immutable log).

## 5. خطة التطبيق
| الخطوة | Migration | الكود |
|---|---|---|
| 1 | `operation_idempotency` table + index | helper `withIdempotency()` في كل edge function |
| 2 | `activity_logs` add correlation columns | `lib/observability.ts` يولّد ويُمرّر correlation |
| 3 | Trigger immutability على journal_entries posted | تعديل `journal.service` لإلزام reversal |
| 4 | Linter cleanup لـ `search_path` | — |
| 5 | مسح callsites `hasPermission` للعمليات الحساسة | إضافة فحص خادم |

## 6. اختبارات أمنية مطلوبة (إضافة)
- `__tests__/security/idempotency.test.ts` — replay payment.
- `__tests__/security/correlation.test.ts` — تتبع uuid.
- `__tests__/security/journal-immutability.test.ts` — UPDATE posted = خطأ.
- توسيع `tenant-isolation.test.ts` بحالات cross-tenant بـ idempotency.

## 7. مؤشرات قبول
- 0 تحذيرات من `supabase--linter` للدوال الحرجة.
- كل العمليات المالية تمر عبر idempotency.
- `correlation_id` متاح في كل سطر `activity_logs` لاحق.
