# تقرير التدقيق المعماري الشامل — ERP Smart Arabic / Nazra
> Phase 1 deliverable. تاريخ: 2026-05-08. النطاق: الكود + قاعدة البيانات + Edge Functions + طبقة Offline.

## ملخص تنفيذي
| المؤشر | القيمة | الحالة |
|---|---|---|
| إجمالي أسطر الكود (src) | ~115,000 | — |
| ملفات > 400 سطر | 39 (باستثناء types المُولّد) | High |
| استدعاءات `supabase.from(...)` مباشرة من `components/`+`pages/` | **133** في 50 ملف | **High** — يجب توجيهها لـ repositories |
| استخدامات `as any` / `: any` | 189 | Med |
| استخدامات `console.log/warn/error` المباشرة | 105 | Low — توحيد عبر `observability` |
| Edge Functions | 12 | — |
| Migrations | 142 | OK |

## 1. تقييم البنية

### 1.1 طبقات موجودة (إيجابيات)
- `src/lib/repositories/` — موجود (8 ملفات).
- `src/lib/services/` — موجود (8 ملفات).
- `src/lib/financial-engine/` — محرك مالي مستقل.
- `src/types/entities.ts` — DTOs موحدة من Supabase types.
- `src/lib/observability.ts`, `runtimeTelemetry.ts` — أساس Logger.

### 1.2 فجوات بنيوية (يجب معالجتها)
| # | الفجوة | الأثر | المرحلة |
|---|---|---|---|
| A1 | **133 استدعاء `supabase.from()` مباشر** من UI | تسريب منطق البيانات، صعوبة اختبار، تكرار قواعد العمل | Phase 2 Batch C |
| A2 | لا يوجد `domain/` للنماذج النقية | منطق محاسبي/مالي مبعثر | Phase 2 |
| A3 | لا يوجد `queryKeys` factory | مفاتيح كاش مكررة → invalidation هشّ | Phase 2 Batch E |
| A4 | لا توجد طبقة `features/` تجمع UI+hooks | tight coupling بين pages و components | Phase 2 |

## 2. الملفات المرشحة للتقسيم (>400 سطر)
أعلى 15 (باستثناء tests و types المولّد):

| الملف | الأسطر | الإجراء |
|---|---|---|
| `components/ui/sidebar.tsx` | 637 | shadcn — تركه |
| `pages/customers/CustomerDetailsPage.tsx` | 558 | تقسيم: header / tabs / actions |
| `components/customers/list/CustomerListCard.tsx` | 538 | استخراج subviews + actions hook |
| `lib/arabicFont.ts` | 512 | data — تركه |
| `lib/pdfGenerator.ts` | 509 | تقسيم لـ sections (header/items/totals/footer) |
| `components/layout/MobileDrawer.tsx` | 489 | تقسيم: nav sections / search / footer |
| `pages/reports/ReturnsReportPage.tsx` | 487 | استخراج hook + filters + table |
| `pages/quotations/QuotationsPage.tsx` | 484 | استخراج hook + columns |
| `components/credit-notes/CreditNoteFormDialog.tsx` | 477 | hook منفصل + items view |
| `components/settings/BackupTab.tsx` | 466 | sub-tabs منفصلة |
| `pages/employees/EmployeeDetailsPage.tsx` | 458 | tabs منفصلة |
| `lib/navigation.ts` | 456 | بيانات — تجزئة لمجلد |
| `pages/quotations/QuotationDetailsPage.tsx` | 455 | header/items/actions |
| `pages/sales-orders/SalesOrdersPage.tsx` | 454 | hook + columns |
| `pages/invoices/InvoiceDetailsPage.tsx` | 445 | header/items/payments |

النمط الموصى به (مُجرّب على `RestoreBackupDialog`: 1216 → 166 سطر، −86%):
**constants → views → hook → presentational shell**.

## 3. الأمان (تفاصيل في `security-hardening-report.md`)

### 3.1 استنتاجات سريعة
- جميع الجداول الحرجة عليها RLS (مذكور في memory).
- لا يوجد جدول `operation_idempotency` لمنع replay العمليات المالية. **Critical** — يُضاف في Phase 3.
- بعض Edge Functions تعتمد على `verify_jwt = false` بدون توثيق سبب صريح في الكود (`process-payment`, `approve-invoice`, `restore-backup`). يجب تأكيد JWT in-code (موجود غالبًا) + idempotency key.
- لا يوجد `x-correlation-id` موحّد بين الواجهة و edge functions و `activity_logs`.

### 3.2 صلاحيات
- `usePermissions` يوفر `verifyPermissionOnServer` و `verifyFinancialLimitOnServer` ✅.
- يجب تدقيق أن العمليات الحساسة لا تستخدم `hasPermission` (client-only) فقط. مسح أولي: تحتاج جولة مراجعة لكل callsite.

## 4. سلامة المحاسبة
- `financial-engine/` يحتوي: posting.rules / journal.service / ledger.service / period.service / reconciliation.
- اختبارات تكامل موجودة: `accounting-workflow.test.ts`, `financial-calculations.test.ts`.
- **مفقود**:
  - Trigger DB يمنع UPDATE/DELETE على `journal_entries.status='posted'` (يجب التحقق — قد يكون موجودًا).
  - Invariant test: ضمان `SUM(debit)=SUM(credit)` لكل journal عبر CHECK trigger.
  - اختبار replay: payment يُرسل مرتين بنفس idempotency key → يجب أن ينتج postings واحد فقط.

## 5. المزامنة Offline
- `useOfflineMutation`, `syncManager`, `offlineStorage` — موجودة.
- **مخاطر**:
  - لا يوجد `client_op_id` يُرسل للسيرفر → خطر تكرار عند إعادة المحاولة.
  - لا يوجد `version` على الجداول الحرجة → فقدان optimistic concurrency.
  - منطق conflict resolution = "server wins" ضمنيًا بدون تسجيل التعارضات.

## 6. الأداء
- Materialized views موجودة + fallback (memory).
- `useVirtualList` موجود لكن غير مُستخدم في كل القوائم الكبيرة — تدقيق مطلوب.
- `queryConfig` موجود — لكن `staleTime` ليس موحدًا عبر كل الاستعلامات.

## 7. أمان الأنواع
- 189 موضع `as any` / `: any` — معظمها في tests. الإنتاجي يحتاج 2-3 جولات تنظيف.
- لا توجد Zod schemas موحدة للـ DTOs الحرجة (Invoice/Payment/Journal). موجود فقط في `validations.ts` لـ forms.

## 8. Observability
- 105 `console.log/warn/error` مباشرة → استبدالها بـ `logErrorSafely` / logger موحّد.
- Correlation ID مفقود.

## 9. خارطة الطريق (Sequencing)
```text
1. Idempotency table + correlation IDs        ── Phase 3 (Critical)
2. Posted-journal immutability triggers       ── Phase 4
3. client_op_id + version columns             ── Phase 5
4. queryKeys factory + invalidation cleanup   ── Phase 2 Batch E
5. Repository migration (133 callsites)       ── Phase 2 Batch C (تدريجي)
6. File splits لأكبر 15 ملف                   ── Phase 2 Batch A/B
7. Logger consolidation                       ── Phase 8
8. any/Zod sweep                              ── Phase 7
```

## 10. مؤشرات نجاح قابلة للقياس
- استدعاءات `supabase.from()` في `components/`+`pages/` → **0**.
- ملفات > 500 سطر (باستثناء shadcn/types/data) → **0**.
- جميع Edge Functions المالية تحوي idempotency check → **100%**.
- اختبار replay payment يمر → ✅.
- `console.*` مباشر في الإنتاج → < 10.
