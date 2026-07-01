## UX-2C Read Model & Outbox — v3 (Projection layer + stable RPC + zero triggers)

قُبلت النقاط الأربع بالكامل. التعديلات الجوهرية:

1. **Baseline** بمعرّف مستقل عن SemVer.
2. **صفر triggers** — لا حتى safety net.
3. **RPC واحد ثابت** بحمولة قابلة للتوسعة.
4. **`InvoiceProjector` ينتقل من `domain/` إلى طبقة `projection/` مستقلة** خارج قلب النموذج (يعتمد على أحداث الـ Domain فقط، لا يعرف DB/DTOs الخاصة بـ read_model).

---

### Phase 0 — Baseline `BASELINE-UX2B-001`

- `docs/architecture/baseline/BASELINE-UX2B-001.md` (manifest مرجعي).
- `scripts/audits/build-baseline-tag.mjs` ⇒ `baseline-ux2b-001.json` (composite SHA256 عبر ADRs + lock files + surface manifests + PROJECT_MAP).
- `scripts/fitness/check-baseline-tag-integrity.mjs` (الفحص #23) — يتحقّق من عدم تعديل baseline بعد إغلاقه.
- `docs/adr/0013-baseline-architecture-tags.md` (Accepted): مخطط التسمية `BASELINE-<PHASE>-<SEQ>`؛ لا SemVer، لا تعديل بعد الإغلاق، رفع Baseline = ملف جديد.
- التسلسل المستقبلي: `BASELINE-UX2B-001` → `BASELINE-UX2C-W3A-001` → `BASELINE-UX2C-W3B-001`.

---

### Phase 1 — Wave 3A: Projection Layer + Read Model

#### طبقة جديدة: `src/projection/finance/invoice/`

**ليست Domain، وليست Application، وليست Infrastructure.** طبقة رابعة بجانبها لأن الـ Projector عمومًا:
- يعتمد على أحداث الـ Domain فقط (يستورد من `@/domain/finance` الـ barrel).
- لا يعرف DB، ولا SQL، ولا `MoneyView`/`InvoiceView`.
- يُنتج **حالة داخلية بسيطة** (`InvoiceProjectionStateV1`) قابلة لإسناد أي storage لاحقًا.
- قابل لإعادة الاستخدام لبناء أي إسقاط مستقبلي (تحليلات، تقارير، إشعارات).

الفصل بين:
- **`ProjectionState`** (نتاج Projector النقي، بلا حقول عرض).
- **`ReadModelRow`** (تمثيل جدول `invoice_read_model` — يعيش في Infrastructure).
- **`InvoiceView`** (DTO حدود الـ Application — يبقى كما هو من Wave 6).

الـ mapping `ProjectionState → ReadModelRow` يعيش في `infrastructure/finance/invoice/projection/` (adapter نقي).

#### M3A-1 — Projector النقي (طبقة Projection)

`src/projection/finance/invoice/InvoiceProjectorV1.ts`:

```ts
export interface InvoiceProjectionStateV1 {
  readonly projectionVersion: 1;
  readonly aggregateId: string;   // string فقط — لا branded types عبر الحدود
  readonly tenantId: string;
  readonly status: InvoiceStatus;
  readonly currency: string;
  readonly totalNetMinor: bigint;
  readonly totalTaxMinor: bigint;
  readonly totalGrossMinor: bigint;
  readonly paidMinor: bigint;
  readonly outstandingMinor: bigint;
  readonly invoiceNumber: string;
  readonly issuedAtISO: string | null;
  readonly lastEventSequence: number;
  readonly lastEventId: string;
}

export interface InvoiceProjector<S> {
  readonly version: number;
  empty(aggregateId: string, tenantId: string): S;
  apply(state: S, event: AnyInvoiceEvent): S;   // pure
  checksum(state: S): string;                    // stable SHA256 (نقطة #8)
}

export const InvoiceProjectorV1: InvoiceProjector<InvoiceProjectionStateV1>;
```

- `ProjectorRegistry` بنفس نمط `EventCodecRegistry` (نقطة #3 versioning).
- Unit tests نقية بلا DB — تُغطّى ضمن vitest.finance.

#### M3A-2 — Migration (بلا triggers أبدًا — نقطة #2)

جدول `public.invoice_read_model`:
- الأعمدة: `tenant_id`, `aggregate_id PK`, `invoice_number`, `currency`, `status`, `total_*_minor bigint`, `paid_minor`, `outstanding_minor`, `issued_at`, `last_event_sequence`, `last_event_id`, `projection_version smallint NOT NULL`, `checksum text NOT NULL`, `updated_at`.
- Indexes: `(tenant_id, status, issued_at desc)`, `(tenant_id, invoice_number)`, partial `(tenant_id) WHERE projection_version < N` لكشف الصفوف القديمة عند الترقية.
- GRANTs: `SELECT` لـ `authenticated`، `ALL` لـ `service_role` (لا INSERT/UPDATE/DELETE للمستخدم).
- RLS: `tenant_id = current_tenant()`.
- **لا trigger مطلقًا** — الكشف عن الانحراف عبر `ProjectionRebuilder + checksum + CI`.

#### M3A-3 — RPC ثابت `commit_invoice_events` (نقطة #3)

توقيع مستقر منذ Wave 3A، لا يتغيّر في 3B:

```sql
create or replace function public.commit_invoice_events(
  p_tenant_id  uuid,
  p_events     jsonb,             -- array of persisted event rows
  p_projection jsonb,             -- single projected row (upsert target)
  p_outbox     jsonb default null -- array of outbox rows; null في 3A
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.invoice_events select * from jsonb_populate_recordset(null::public.invoice_events, p_events);
  insert into public.invoice_read_model select * from jsonb_populate_recordset(null::public.invoice_read_model, jsonb_build_array(p_projection))
    on conflict (aggregate_id) do update set ...;
  if p_outbox is not null then
    insert into public.invoice_outbox select * from jsonb_populate_recordset(null::public.invoice_outbox, p_outbox);
  end if;
end;
$$;
```

- كل شيء داخل معاملة واحدة ذرّية.
- `p_outbox` يصبح مفعّلًا في 3B **بدون تغيير الاسم أو التوقيع**.
- SQLSTATE الشائعة (`23505` تكرار sequence، `23514` violation) تُترجم بواسطة `pgErrorMap` الحالي (يُوسَّع بحالة الإسقاط عند اللزوم).

#### M3A-4 — Repository يستدعي RPC داخل نفس المعاملة

`SupabaseInvoiceRepository.appendEvents` يُعدَّل ليأخذ Projector كاعتماد اختياري:

```text
TS: state' = Projector.foldFrom(currentState, newEvents)
TS: checksum = Projector.checksum(state')
TS: rows    = events.map(codec.encode)
TS: proj    = ReadModelRowMapper.from(state', checksum)
TS: rpc('commit_invoice_events', { p_tenant_id, p_events: rows, p_projection: proj, p_outbox: null })
```

- `Invoice.pullEvents()` + `committedVersion()` يمنحان الحالة السابقة اللازمة (rehydrate → currentState → apply new).
- `expectedVersion` يبقى ضمانة الـ Repository (unique `(aggregate_id, sequence)` هو enforcement الحقيقي).

#### M3A-5 — `ProjectionRebuilder` يعيد استخدام نفس Projector (نقطة #2)

`src/application/finance/invoice/projections/ProjectionRebuilder.ts`:
- يقرأ history عبر `InvoiceRepository`.
- يطوي عبر **نفس** `InvoiceProjectorV1` (بلا نسخة موازية).
- يكتب عبر port جديد `InvoiceProjectionWriter` (admin-only، `service_role`).
- يقارن `checksum` قبل/بعد؛ يرفع `projection_version` عند الترقية.
- محمي بـ `ADMIN_BACKFILL=1`.

#### M3A-6 — Read Ports مقسومة (نقطة #7)

- `InvoiceLookupQuery.byId(id, ctx) → InvoiceView`.
- `InvoiceListQuery.list(query, ctx) → Page<InvoiceListItemView>`.
- `InvoiceReadModel = InvoiceLookupQuery & InvoiceListQuery` (type alias توافقي، يُحذف في baseline لاحق).

#### M3A-7 — Application: Query Handlers

- `GetInvoiceByIdHandler` (يعتمد `InvoiceLookupQuery` فقط).
- `ListInvoicesHandler` (يعتمد `InvoiceListQuery` فقط).
- سترينغز عبر الحدود؛ لا `Money`؛ لا `bigint`؛ لا `Invoice.fromHistory`.

#### M3A-8 — Infrastructure

- `SupabaseInvoiceReadModel` يطبّق الواجهتين.
- `ReadModelRowMapper` (Infra) يحوّل `InvoiceProjectionStateV1 → invoice_read_model row` وبالعكس.
- `mapPgError` يُوسَّع لتغطية أخطاء RPC.

#### M3A-9 — Fitness Checks الجديدة (5 ⇒ المجموع 27)

- `check-projector-purity.mjs`: `projection/**` لا يستورد `infrastructure/**` ولا `application/**`؛ لا `Date.now`/I/O/`Math.random`؛ لا يستورد `InvoiceView`/`MoneyView`.
- `check-projection-layer-boundary.mjs`: `domain/**` لا يستورد `projection/**` (طبقة Projection ليست جزءًا من Domain).
- `check-no-read-model-triggers.mjs`: يفحص `supabase/migrations/**` ويُحرّم أي `CREATE TRIGGER` على `invoice_read_model` أو `invoice_outbox`.
- `check-read-model-grants.mjs`: منع INSERT/UPDATE/DELETE للمستخدم النهائي على `invoice_read_model`.
- `check-read-port-segregation.mjs`: منع دمج المنفذين خارج Composition Root.

#### M3A-10 — Verification Gates

| Gate       | يثبت                                                           |
|------------|----------------------------------------------------------------|
| G-PROJ-EQ  | Projector(events) = الصف المخزَّن (byte-equal + checksum مطابق) |
| G-TX-ATOM  | فشل UPSERT الإسقاط ⇒ rollback لإدراج الأحداث                   |
| G-VERSIONED| رفع `projection_version` يكشف الصفوف القديمة                    |
| G-RLS-R    | عزل مستأجر + رفض orphan على القراءة                            |
| G-PURE-R   | لا Money/bigint عبر سطح القراءة                                |
| G-LAYER    | Projector لا يعرف Infra/DTOs/DB                                |
| G-NO-TRIG  | صفر triggers على `invoice_read_model` و `invoice_outbox`       |
| G-RPC-STABLE| توقيع `commit_invoice_events` غير قابل للتغيير                 |

#### M3A-11 — ADR-0014 ثلاثة أقسام (نقطة #9)

- **A — Projection Rules**: L-RM1..L-RM6 (Projector في طبقة `projection/` مستقلة؛ صفر triggers؛ Rebuilder = نفس Projector؛ `projection_version` + `checksum` إلزاميان؛ الكتابة داخل RPC واحد ذري؛ ProjectorRegistry بنفس نمط EventCodecRegistry).
- **B — Outbox Rules** (تُستكمل في 3B): صفر triggers؛ صفوف الـ outbox تُكتب عبر نفس `commit_invoice_events` بحمولة `p_outbox`.
- **C — Query Model Rules**: تقسيم Lookup/List؛ سترينغز عبر الحدود؛ لا aggregate construction في handlers.

#### M3A-12 — Lock + PROJECT_MAP

- `scripts/audits/output/ux2c-wave3a-lock.json`.
- تحديث `PROJECT_MAP.md` بطبقة **Projection** الجديدة:

```text
Domain ─── events ───► Projection ─── state ───► Infra (RPC, RowMapper)
                                                  │
                                                  ▼
                                          invoice_read_model
```

- قسم جديد **Projection Inventory** (نقطة #10):

```text
| Projection       | Source Stream  | Projector Version | Layer      | Owner   |
|------------------|----------------|-------------------|------------|---------|
| InvoiceReadModel | invoice_events | v1                | projection | Finance |
```

- رفع baseline ⇒ `BASELINE-UX2C-W3A-001`.

---

### Phase 2 — Wave 3B: Outbox (نفس RPC، حمولة `p_outbox` تُفعَّل)

#### M3B-1 — Migration

جدول `public.invoice_outbox`:
- `event_id PK`, `tenant_id`, `aggregate_id`, `sequence int NOT NULL`, `published_sequence bigserial` (نقطة #5), `type`, `payload jsonb`, `metadata jsonb`, `status` ('pending'|'inflight'|'sent'|'dead'), `attempts int`, `next_attempt_at`, `claimed_by`, `claimed_at`, `last_error`.
- Indexes: `(status, next_attempt_at) WHERE status IN ('pending','inflight')`, `(aggregate_id, sequence)`.
- GRANTs: `service_role` فقط.
- **لا trigger** — الـ Repository يمرّر `p_outbox` في نفس RPC `commit_invoice_events` (بدون migration جديد للـ RPC — التوقيع يقبل `p_outbox` منذ 3A).

#### M3B-2 — Domain Ports

- `OutboxPort.claim/ack/fail/deadLetter` (يستخدم `FOR UPDATE SKIP LOCKED`).
- `Publisher.publish(envelope)`.
- **`DispatcherDriver` Port** (نقطة #6): `IntervalDriver` الافتراضي؛ فروع `CronDriver`/`QueueDriver` لاحقًا بلا كسر.

#### M3B-3 — Infrastructure & Composition

- `SupabaseOutboxAdapter` (`OutboxPort`).
- `OutboxDispatcher` orchestrator خالص يستهلك `OutboxPort + Publisher + DispatcherDriver`.
- ترتيب النشر داخل aggregate = `sequence` (نقطة #5)، backoff أُسّي، DLQ عند `attempts >= 8`.
- `createFinanceModule({ outbox?: { publisher; driver? } })` — الميزة اختيارية، لا تكسر 3A.

#### M3B-4 — Fitness Checks (3 ⇒ المجموع 30)

- `check-outbox-atomicity.mjs`: منع INSERT إلى `invoice_outbox` خارج RPC المعتمد.
- `check-publisher-isolation.mjs`: `Publisher` يُستدعى حصرًا من `OutboxDispatcher`.
- `check-dispatcher-driver-port.mjs`: منع `setInterval/setTimeout` مباشر داخل `OutboxDispatcher`.

#### M3B-5 — Gates

| Gate     | يثبت                                                        |
|----------|-------------------------------------------------------------|
| G-ATOMIC | صف outbox يُكتب ⇔ كُتب الحدث (rollback المشترك)             |
| G-ORDER  | ترتيب النشر داخل aggregate = sequence                        |
| G-RETRY  | فشل ⇒ backoff ⇒ DLQ عند 8                                   |
| G-IDEMP  | publish مزدوج بنفس event_id لا يُكرَّر                       |
| G-DRIVER | استبدال Driver لا يمسّ Dispatcher                            |
| G-NO-TRIG| صفر triggers جديدة على `invoice_outbox`                     |

#### M3B-6 — Lock

- ADR-0014 §B يُختم.
- تحديث Projection Inventory في `PROJECT_MAP.md` بطبقة Outbox.
- `scripts/audits/output/ux2c-wave3b-lock.json`.
- رفع baseline ⇒ `BASELINE-UX2C-W3B-001`.

---

### الترتيب الزمني

```text
Phase 0 ─ BASELINE-UX2B-001              (لا كود إنتاج)
Phase 1 ─ Wave 3A: Projection + Read     (الموجة الكبرى الحالية)
Phase 2 ─ Wave 3B: Outbox                (بعد إغلاق 3A)
Phase 3 ─ Wave 4: Ledger/Posting         (يستهلك Outbox)
Phase 4 ─ Wave 5: Saga                   (عند الحاجة)
```

---

### مطابقة الملاحظات الأربع

| # | الملاحظة                              | القرار في v3                                                   |
|---|--------------------------------------|----------------------------------------------------------------|
| 1 | Baseline بلا SemVer                  | `BASELINE-UX2B-001` + ADR-0013 يوثّق المخطط                    |
| 2 | صفر triggers                         | `check-no-read-model-triggers` + إزالة أي مفهوم safety-net    |
| 3 | RPC ثابت قابل للتوسعة                | `commit_invoice_events(p_tenant_id, p_events, p_projection, p_outbox=null)` منذ 3A |
| 4 | موضع Projector                       | طبقة جديدة `src/projection/` خارج Domain + `check-projection-layer-boundary` |

النقاط 5–10 من الجولة السابقة (published_sequence، DispatcherDriver، تقسيم Lookup/List، checksum، ADR ثلاثي، Projection Inventory) محفوظة كما هي.

جاهز للتنفيذ ابتداءً من **Phase 0 (BASELINE-UX2B-001)** فور موافقتك.
