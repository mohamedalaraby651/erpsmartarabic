# المحور 2 — الطبقة الأولى: قاعدة بيانات اللوجستيات والمطابقة

بناء **DB Layer فقط** (بدون UI). يلتزم بالقرارات المتفق عليها:
- إنشاء `purchase_invoices` ضمن نفس الـ Migration (Three-Way Matching كامل).
- ترحيل عبر **RPC + Trigger** (RPC يغيّر الحالة، Trigger يولّد الحركة).
- نقص المخزون في DN: **سماح بسالب + تحذير في `sync_logs`**.

---

## 1) الجداول الجديدة (6 جداول)

### أ) إيصالات الاستلام
```text
goods_receipts(
  id, tenant_id, receipt_number UNIQUE per tenant,
  purchase_order_id FK→purchase_orders, supplier_id FK→suppliers,
  warehouse_id FK→warehouses, received_date DATE,
  status ENUM('draft','posted','cancelled') DEFAULT 'draft',
  posted_at, posted_by, notes, created_by, created_at, updated_at
)

goods_receipt_items(
  id, tenant_id, receipt_id FK CASCADE,
  product_id, variant_id NULL,
  ordered_qty NUMERIC, received_qty NUMERIC CHECK >= 0,
  unit_cost NUMERIC, notes
)
```

### ب) إذونات التسليم
```text
delivery_notes(
  id, tenant_id, delivery_number UNIQUE per tenant,
  sales_order_id FK→sales_orders NULL,
  invoice_id FK→invoices NULL,         -- نسمح بربط بفاتورة مباشرة
  customer_id, warehouse_id, delivery_date,
  status ENUM('draft','in_transit','delivered','cancelled'),
  posted_at, posted_by, ...
)

delivery_note_items(
  id, tenant_id, delivery_id FK CASCADE,
  product_id, variant_id NULL,
  ordered_qty, delivered_qty CHECK >= 0, notes
)
```

### ج) فواتير المشتريات (جديد بالكامل)
```text
purchase_invoices(
  id, tenant_id, invoice_number UNIQUE per tenant,
  supplier_id, purchase_order_id FK NULL,
  invoice_date DATE, due_date DATE,
  subtotal, tax_amount, discount_amount, total_amount,
  paid_amount DEFAULT 0,
  status ENUM('draft','posted','paid','cancelled'),
  payment_status ENUM('pending','partial','paid'),
  matching_status ENUM('matched','over_received','under_received','no_receipt'),
  approval_required BOOLEAN DEFAULT false,
  posted_at, posted_by, notes, created_by/at, updated_at
)

purchase_invoice_items(
  id, tenant_id, invoice_id FK CASCADE,
  product_id, variant_id NULL,
  quantity NUMERIC, unit_price, total_price, notes
)
```

كل الجداول: `tenant_id NOT NULL`، فهارس على `(tenant_id, status)` و FKs.

---

## 2) الترقيم التلقائي
ثلاث Sequences جديدة + ثلاث Triggers `BEFORE INSERT`:
- `GR-YYYYMMDD-NNNN` — `goods_receipts`
- `DN-YYYYMMDD-NNNN` — `delivery_notes`
- `PINV-YYYYMMDD-NNNN` — `purchase_invoices`

---

## 3) RLS (إجباري لكل الجداول)
نفس النمط المعتمد:
- **SELECT**: `tenant_id = get_current_tenant()`
- **INSERT**: `tenant_id = get_current_tenant() AND check_section_permission(uid,'inventory'|'purchases','create')`
- **UPDATE**: `+ check_section_permission(...,'edit')` ومنع تعديل سطور مرحّلة (`status='posted'`)
- **DELETE**: مرفوض إذا `status='posted'` (Trigger BEFORE DELETE)

---

## 4) Triggers المنطقية

### T1 — `trg_stock_movement_on_gr_post`
على `goods_receipts AFTER UPDATE OF status WHEN OLD.status='draft' AND NEW.status='posted'`:
- لكل سطر: `INSERT INTO stock_movements (movement_type='in', to_warehouse_id, quantity, reference_type='goods_receipt', reference_id=NEW.id)`
- `UPSERT product_stock SET quantity = quantity + received_qty`
- يحدّث `products.cost_price` بمتوسط مرجّح اختياري (Phase 2 — نتركه الآن).

### T2 — `trg_stock_movement_on_dn_post`
على `delivery_notes` بنفس النمط لكن `movement_type='out'`، `from_warehouse_id`، خصم من `product_stock`.
- إذا `current_qty - delivered_qty < 0`:  
  `INSERT INTO sync_logs (level='warning', endpoint='delivery_note_post', metadata={product_id, requested, available, deficit})` — **بدون رفض**.

### T3 — `trg_three_way_matching` على `purchase_invoices`
عند `BEFORE UPDATE OF status WHEN NEW.status='posted'`:
- يحسب لكل منتج في الفاتورة: `SUM(received_qty)` من جميع `goods_receipt_items` المرتبطة بنفس `purchase_order_id`.
- يقارن بـ `quantity` في `purchase_invoice_items`:
  - مساوية → `matching_status='matched'`
  - أقل → `matching_status='under_received'` (سماح)
  - أكبر → `matching_status='over_received'` + `approval_required=true` + رفع `WARNING` في `sync_logs`
- إذا لا يوجد أي GR → `matching_status='no_receipt'` + `approval_required=true`

### T4 — حماية الترحيل
- `BEFORE UPDATE`: إذا `OLD.status='posted'` لا يُسمح بتعديل أي حقل مالي/كمي.
- `BEFORE DELETE`: يُرفض إذا `status='posted'`.

### T5 — `log_activity` على الجداول الستة (الموجود مسبقًا).

---

## 5) RPCs (4 دوال SECURITY DEFINER)

### `post_goods_receipt(p_id uuid) → jsonb`
- يتحقق من `tenant_id` و الصلاحية (`inventory.edit`).
- يقفل الصف `FOR UPDATE`.
- يرفض إذا الحالة ليست `draft`.
- يحدّث `status='posted', posted_at=now(), posted_by=auth.uid()`.
- يعتمد على T1 لإنشاء الحركة.
- يُرجع `{success, receipt_id, movements_created}`.

### `post_delivery_note(p_id uuid) → jsonb`
- نفس النمط، يعتمد على T2.
- يُرجع تحذيرات نقص المخزون في الـ payload.

### `post_purchase_invoice(p_id uuid) → jsonb`
- يعتمد على T3 لاحتساب المطابقة.
- إذا `approval_required=true` ولم يكن المستخدم admin → يرجع `{success:false, requires_approval:true}` بدون ترحيل.

### `cancel_goods_receipt(p_id uuid, _reason text) → jsonb`
- لـ GR مرحّل: ينشئ حركة عكسية `out` ويصفّر المخزون (مثل `void_invoice`). نفس النمط لـ DN.

كل RPC: `REVOKE EXECUTE FROM anon, public; GRANT EXECUTE TO authenticated`.

---

## 6) الفهارس
```sql
goods_receipts(tenant_id, status), (purchase_order_id), (supplier_id, received_date DESC)
goods_receipt_items(receipt_id), (product_id)
delivery_notes(tenant_id, status), (sales_order_id), (customer_id, delivery_date DESC)
delivery_note_items(delivery_id), (product_id)
purchase_invoices(tenant_id, status), (supplier_id, invoice_date DESC), (matching_status)
purchase_invoice_items(invoice_id), (product_id)
```

---

## 7) ما لن يتم في هذه الطبقة
- ❌ أي UI / صفحات / Hooks (الطبقة 2).
- ❌ القيود المحاسبية التلقائية للـ GR (الطبقة 3).
- ❌ تحديث `cost_price` بمتوسط مرجّح (يُؤجَّل).
- ❌ Edge Functions.

---

## 8) خطوات التنفيذ
1. Migration واحد شامل: ENUMs → Tables → Sequences → Indexes → RLS → Triggers → RPCs → Grants.
2. تحقق ما بعد التنفيذ بـ `supabase--read_query`:
   - وجود الجداول الـ 6 + الـ ENUMs.
   - عدد policies = 24 (4 لكل جدول).
   - الـ 5 triggers مفعّلة.
   - الـ 4 RPCs محصورة على `authenticated`.
3. اختبار سريع: إدراج GR تجريبي، ترحيله، التحقق من ظهور صف في `stock_movements` وزيادة `product_stock`.
4. تحديث memory: إنشاء `mem://features/document-cycle/logistics-layer` يوثّق الـ Triggers والـ RPCs.

---

## ملاحظة فنية (للمراجعة)
- لم نُنشئ `purchase_payments` هنا (موجود `supplier_payments` بالفعل، سنربطه بـ `purchase_invoices` في الطبقة 3 المحاسبية).
- `matching_status='over_received'` لا يرفض الترحيل (مرونة) لكن يرفع flag للموافقة الإدارية لاحقًا.
- نقص المخزون في DN يُسمح به (سياستك) مع تحذير دائم في `sync_logs` — قابل للمراجعة عبر تقرير لاحق.

**الخطة جاهزة للتنفيذ بمجرد الموافقة.**
