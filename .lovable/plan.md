

# خطة التطوير المؤسسي الشامل (Enterprise Hardening Plan)

## السياق

تم تأكيد أن المشروع يحتوي بالفعل على بنية متقدمة:
- **76 migration** + **8 edge functions** + **5 services** + **6 repositories**
- `observability.ts` موجود (structured logging)
- `secureOperations.ts` يفرض server-side validation
- Multi-tenant + RLS + Double-entry + SoD + Approval chains مفعّلة

التقييم الذي قدمه المستخدم دقيق، لكن بعض النقاط **مُنفّذة جزئياً**. الخطة تركز على **إغلاق الفجوات الفعلية** فقط.

---

## المراحل (5 مراحل، 18 مهمة)

### المرحلة 1: تقوية العزل والأداء (Critical Performance)

| # | المهمة | الملف | القيمة |
|---|--------|-------|--------|
| 1 | إضافة Composite Indexes على الجداول الكبرى | Migration | تسريع 10-50x |
| 2 | تفعيل `auth.jwt()` claim للـ tenant في RLS (تقليل RPC calls) | Migration + RLS update | تقليل latency |
| 3 | Query Performance Monitor — جدول `slow_queries_log` + RPC | Migration + hook | كشف bottlenecks |

**Composite Indexes المقترحة:**
```sql
CREATE INDEX CONCURRENTLY idx_invoices_tenant_status_date ON invoices(tenant_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_payments_tenant_date ON payments(tenant_id, payment_date DESC);
CREATE INDEX CONCURRENTLY idx_journal_entries_tenant_period ON journal_entries(tenant_id, fiscal_period_id);
-- + 8 indexes أخرى للجداول الحرجة
```

---

### المرحلة 2: Event-Driven Architecture (Domain Events)

| # | المهمة | المخرج |
|---|--------|--------|
| 4 | إنشاء جدول `domain_events` (event sourcing lite) | Migration |
| 5 | إنشاء RPC `emit_event(event_type, payload)` + trigger framework | Migration |
| 6 | Edge Function `event-dispatcher` — يعالج أحداث async | Function |
| 7 | تحويل 5 أحداث رئيسية: `invoice.approved`, `payment.received`, `expense.approved`, `stock.depleted`, `customer.credit_exceeded` | Triggers |

**النموذج:**
```text
invoice_approved → domain_events table → event-dispatcher → 
  ├── post_journal_entry()
  ├── update_customer_balance()
  ├── send_notification()
  └── log_audit_trail()
```

---

### المرحلة 3: Audit Trail الكامل (Before/After Tracking)

| # | المهمة | المخرج |
|---|--------|--------|
| 8 | جدول `audit_trail` موحد مع `before_value` + `after_value` (JSONB) | Migration |
| 9 | Trigger function عام `track_changes()` يطبق على 20+ جدول مالي | Migration |
| 10 | صفحة `/admin/audit-trail` — عرض + بحث + تصدير | Page + components |
| 11 | إضافة `ip_address` + `user_agent` للسجلات الحرجة | Edge function update |

---

### المرحلة 4: Financial Engine الموحد

| # | المهمة | المخرج |
|---|--------|--------|
| 12 | `src/lib/financial-engine/` — طبقة معزولة | Folder |
| 13 | `posting.rules.ts` — قواعد ترحيل القيود (declarative) | TS file |
| 14 | `journal.service.ts` + `ledger.service.ts` — منطق محاسبي مركزي | TS files |
| 15 | RPC `validate_journal_balance()` — يضمن debit = credit قبل الترحيل | Migration |

**البنية المقترحة:**
```text
src/lib/financial-engine/
├── posting.rules.ts          # قواعد التوجيه المحاسبي
├── journal.service.ts        # إنشاء القيود
├── ledger.service.ts         # استعلام دفتر الأستاذ
├── period.service.ts         # إغلاق الفترات
└── reconciliation.service.ts # تسوية الحسابات
```

---

### المرحلة 5: Observability + Reporting Layer

| # | المهمة | المخرج |
|---|--------|--------|
| 16 | تفعيل `observability.ts` فعلياً عبر Edge Function `log-event` (بدل console فقط في الإنتاج) | Function |
| 17 | Read Models: 3 Materialized Views للتقارير الثقيلة (`mv_sales_summary`, `mv_inventory_valuation`, `mv_ar_aging`) + pg_cron refresh | Migration |
| 18 | Permission Matrix Cache — جدول `permission_matrix_cache` يُحدّث عند تغيير الأدوار (بدل استدعاء `check_section_permission` كل مرة) | Migration + hook update |

---

## ملخص الملفات

| الفئة | العدد |
|-------|-------|
| Migrations جديدة | 6 |
| Edge Functions جديدة | 2 (`event-dispatcher`, `log-event`) |
| ملفات Financial Engine | 5 |
| Hooks جديدة | 3 |
| صفحات إدارية جديدة | 1 (`/admin/audit-trail`) |
| تحديث ملفات موجودة | ~15 |

---

## ما لن يتم تنفيذه (مع الأسباب)

| البند | السبب |
|-------|-------|
| **Schema-per-tenant** | الـ Row-level isolation الحالي كافٍ لـ <1000 tenant — التحويل مكلف ولا يحتاج الآن |
| **Zustand للـ state** | TanStack Query + Context الحالي كافٍ — لا توجد مشكلة state fragmentation فعلية |
| **استبدال Supabase (Vendor Lock-in mitigation)** | المشروع SaaS صغير-متوسط، abstraction layer سيُضيف complexity بدون قيمة فعلية الآن |
| **Data warehouse منفصل** | Materialized Views + Read Models داخل نفس DB ستغطي حتى 10K tenant |

---

## ترتيب التنفيذ والأولوية

```text
المرحلة 1 (Performance)  ──► ضرورية فوراً
        │
        ▼
المرحلة 3 (Audit)        ──► قيمة عالية + سهلة
        │
        ▼
المرحلة 2 (Events)       ──► تتطلب Audit أولاً
        │
        ▼
المرحلة 4 (Financial)    ──► تستفيد من Events
        │
        ▼
المرحلة 5 (Observability)──► تكميلية
```

---

## النتيجة المتوقعة

| المقياس | قبل | بعد |
|---------|-----|-----|
| نضج البنية | 8.5/10 | **9.5/10** |
| Production-Ready | MVP/SMB | **Enterprise SaaS** |
| Query Performance | متوسط | محسّن 10x |
| Audit Coverage | 13 جدول | 30+ جدول مع before/after |
| Tenant Capacity | ~100 | ~5000 |
| Security Posture | قوي نظرياً | مُتحقّق فعلياً |

---

## ملاحظات تنفيذية

- **بدون breaking changes**: كل التحديثات إضافية أو خلف feature flags
- **Migrations آمنة**: استخدام `CREATE INDEX CONCURRENTLY` لتجنب locks
- **Backwards compatible**: الـ RPCs الحالية تبقى كما هي + إضافة المُحسّنة بجانبها
- **التنفيذ تدريجي**: كل مرحلة قابلة للنشر مستقلة عن التالية

