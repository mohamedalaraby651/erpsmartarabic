# خطة التحويل إلى ERP مؤسسي — موجة قابلة للتنفيذ

استناداً إلى `docs/architecture-hardening-audit.md` الموجود (المخرج الرسمي للـ Phase 1)، النواة جاهزة: 22 repository، financial-engine كامل، 13 edge function، idempotency helper، correlation IDs، اختبارات أمنية وتكاملية. لن أعيد بناء ما يعمل — أُغلق الفجوات المُحدَّدة فقط، بترتيب يحمي العمليات المالية والمستأجرين.

## مبدأ التنفيذ
- Strangler-fig: 6 موجات ≤ 6 ملفات/موجة، كل واحدة قابلة لـ revert منفرد.
- لا تغيير سلوك مالي قائم بدون migration توافقي + اختبار يثبّت السلوك الجديد.
- كل migration مالي يأتي مع نص rollback في وصفه.
- قياس قبل/بعد: عدد `supabase.from` في UI، ملفات > 500 سطر، تغطية اختبارات replay.

---

## الموجة 1 — Idempotency + Correlation (Critical من التدقيق)
الفجوة #1 في التدقيق: لا يوجد جدول `operation_idempotency` يمنع replay الدفعات.

1. **Migration**: جدول `operation_idempotency` (idempotency_key PK، tenant_id، operation_type، request_hash، response jsonb، status، expires_at).
   - RLS: `tenant_id = get_current_tenant_id()` على الأربعة (deny by default).
   - Index على `(tenant_id, operation_type, created_at)`.
2. **حقن في Edge Functions المالية**: `process-payment` و `approve-invoice` و `create-journal` تستخدم `_shared/idempotency.ts` (موجود بالفعل) — تحقّق من الجدول قبل التنفيذ، خزّن الاستجابة بعده.
3. **`x-correlation-id` end-to-end**: تأكد أن كل edge function يقرأ الـ header ويمرّره إلى `activity_logs` (عمود `correlation_id` يُضاف إن لم يكن).
4. **اختبار replay**: `__tests__/security/idempotency-replay.test.ts` — استدعاء `process-payment` مرتين بنفس المفتاح → نتيجة واحدة + journal واحد.

**Rollback**: `DROP TABLE operation_idempotency` — الـ edge functions تستمر بدون فحص.

---

## الموجة 2 — قفل القيود المُرحَّلة (Posted Journal Immutability)
الفجوة من التدقيق §4: لا trigger يمنع UPDATE/DELETE على `journal_entries.status='posted'`.

1. **Migration**:
   - `BEFORE UPDATE OR DELETE ON journal_entries` trigger يرفع `RAISE 'POSTED_JOURNAL_IMMUTABLE'` عندما `OLD.status='posted'` (يُسمح فقط بتحديث `reversed_by_id` لربط القيد العكسي).
   - Trigger مماثل على `journal_lines` ينظر إلى صف الـ entry الأب.
   - CHECK trigger على `journal_lines` يحرس `SUM(debit)=SUM(credit)` لكل entry عند `status='posted'`.
2. **Tests**: 
   - `accounting-integrity-immutability.test.ts`: UPDATE على entry مرحَّل → throws.
   - `journal-balance-invariant.test.ts`: posting بـ debit≠credit → throws.
3. **Reversal API**: تأكيد أن `journal.service.reverseEntry()` ينشئ entry جديداً يربط بالأصل (لا UPDATE).

**Rollback**: `DROP TRIGGER` — سلوك المحرر يعود كما كان.

---

## الموجة 3 — موجة Repository (تنظيف 50 ملف UI)
الفجوة #1: 133 استدعاء `supabase.from` في UI. سأنفذها بـ 3 دفعات داخل الموجة:

- **3a**: `quotations` (3 ملفات) + `products` (3 ملفات) → repos موجودة.
- **3b**: `customers/list/CustomerSavedViews`, `customers/alerts/AlertItemActions`, `credit-notes/CreditNoteFormDialog`, `employees/EmployeeFormDialog` → repos موجودة أو يضاف stub.
- **3c**: admin (Tenants, Sod, Permissions, ExportTemplates, ApprovalChains) → repo جديد `adminRepository.ts`.

**ESLint guard**: قاعدة محلية ترفض `supabase.from(` خارج `src/lib/repositories/` و `src/integrations/` و edge functions. تُضاف في نهاية الموجة لمنع الانحدار.

**Rollback**: كل ملف UI revert مستقل.

---

## الموجة 4 — تقسيم الملفات الكبيرة (>500 سطر)
من جدول §2: 5 أهداف منتجة عالياً (تجنّب shadcn/data/types):
- `pages/customers/CustomerDetailsPage.tsx` (558) → header / tabs / actions
- `components/customers/list/CustomerListCard.tsx` (538) → subviews + hook
- `lib/pdfGenerator.ts` (509) → header/items/totals/footer modules
- `components/layout/MobileDrawer.tsx` (489) → nav/search/footer
- `pages/reports/ReturnsReportPage.tsx` (487) → hook + filters + table

النمط المرجعي: constants → views → hook → presentational shell (مُجرَّب على RestoreBackupDialog −86%).

---

## الموجة 5 — Offline & Concurrency (الفجوة §5)
1. **Migration**: `client_op_id uuid` و `version int default 0` على: `invoices`, `payments`, `journal_entries`, `stock_movements` (nullable للسجلات القديمة).
2. **Optimistic concurrency**: RPC `update_with_version(table, id, expected_version, payload)` ترفع `STALE_VERSION` عند عدم التطابق.
3. **`syncManager.ts`**: تمرير `client_op_id = idempotency_key` لكل عملية مالية offline.
4. **`sync_conflicts` table**: تسجيل التعارضات بدلاً من تجاهلها صامتاً.
5. **Tests**: `sync-replay.test.ts` و `optimistic-concurrency.test.ts`.

---

## الموجة 6 — Observability + Type safety + Docs
1. **Logger sweep**: استبدال 105 استخدام `console.*` بـ `logErrorSafely` (codemod محدود + ESLint rule).
2. **`as any` sweep**: 189 موضع — إنتاج فقط (نتجاهل tests). هدف < 30.
3. **Zod schemas**: `domain/invoice.schema.ts`, `payment.schema.ts`, `journal.schema.ts` للـ DTOs الحرجة.
4. **توثيق نهائي**:
   - `docs/refactoring-report.md` (تحديث)
   - `docs/security-fixes.md` (الموجتان 1 و2)
   - `docs/accounting-integrity.md` (قواعد القفل + reversal flow)
   - `docs/performance-optimizations.md`
   - `docs/engineering-governance.md` (تأكيد المعايير من `engineering-standards.md`)

---

## مقاييس النجاح (مطابقة §10 من التدقيق)
| المقياس | الهدف | المصدر |
|---|---|---|
| `supabase.from` في UI | 0 | موجة 3 + ESLint |
| ملفات > 500 سطر (إنتاج) | 0 | موجة 4 |
| edge functions مالية بـ idempotency | 100% | موجة 1 |
| replay test passes | ✅ | موجة 1 + 5 |
| `console.*` في إنتاج | < 10 | موجة 6 |
| اختبار posted-immutability | ✅ | موجة 2 |

---

## ضمانات السلامة
- لا حذف عمود ولا فرض NOT NULL على بيانات قائمة.
- كل trigger مالي يرفض العملية بـ message عربي صريح (`POSTED_JOURNAL_IMMUTABLE`, `STALE_VERSION`).
- لا تعديل على schemas المحجوزة (`auth`, `storage`, `realtime`, `vault`).
- كل RPC جديد: `SET search_path = public` + فحص tenant.
- لا hard-delete على كيان مالي.

---

## ترتيب الجلسة القادمة (إن وافقت)
أبدأ بـ **الموجة 1 كاملة** (idempotency + correlation + replay test) لأنها Critical من التدقيق وتفتح الباب لتأمين باقي الموجات. ثم **الموجة 2** (قفل القيود) في نفس الجلسة إن سمح الحجم.

## سؤال
هل ابدأ بالترتيب أعلاه (1 ثم 2)، أم تفضّل البدء بموجة Repository (3) لتقليل تسريب Supabase في الواجهة أولاً قبل تشديد الـ DB؟
