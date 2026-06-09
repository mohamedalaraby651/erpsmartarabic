# Edge Function Security Audit — `supabase/functions/*/index.ts`

**Audit Date:** 2025-07-10  
**Auditor:** Automated Security Review  
**Scope:** All 13 production edge functions (excluding `og-image`, `_shared/`, test files)  
**Config note:** Every function has `verify_jwt = false` in `config.toml` → **manual JWT validation is mandatory in all 13 functions.**

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Compliant |
| ⚠️ | Partial / weak — needs improvement |
| ❌ | Failing — must be fixed |

### Patterns Audited

| # | Pattern |
|---|---------|
| P1 | CORS headers on **every** response (including errors) |
| P2 | JWT validated via `auth.getClaims(token)` (required because `verify_jwt=false`) |
| P3 | Zod **or** strict manual body validation |
| P4 | Service-role queries on tenant-scoped entities include `.eq('tenant_id', tenantId)` |
| P5 | Rate limiting via `check_rate_limit` RPC |
| P6 | Idempotency via `checkIdempotency` for state-mutating financial operations |
| P7 | Generic error messages in `catch` (no raw exception leaks) |
| P8 | No raw SQL execution (`execute_sql` RPC absent) |

---

## 1. `approve-expense`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `corsHeaders` spread on all return paths |
| P2 | ✅ | `supabaseAuth.auth.getClaims(token)` — L56 |
| P3 | ⚠️ | Manual checks for `expense_id`/`action` (L88-100); no enum guard on `action` field values; no Zod |
| P4 | ❌ | **4 missing tenant filters** (see below) |
| P5 | ✅ | `check_rate_limit` RPC — L72-83 |
| P6 | ✅ | `checkIdempotency` — L122-145 |
| P7 | ✅ | Catch returns `'Internal server error'` — L283 |
| P8 | ✅ | No `execute_sql` |

### P4 Failures — `approve-expense`

| Line | Query | Issue |
|------|-------|-------|
| 149 | `expenses` `.eq('id', approvalData.expense_id)` | No `.eq('tenant_id', tenantId)` — attacker can approve any tenant's expense by guessing UUID |
| 194 | `expenses` `.update(...)` `.eq('id', approvalData.expense_id)` | No tenant filter — cross-tenant state mutation |
| 210 | `cash_registers` `.eq('id', expense.register_id)` | No tenant filter — reads another tenant's register balance |
| 219 | `cash_registers` `.update(...)` `.eq('id', expense.register_id)` | No tenant filter — mutates another tenant's balance |

> **Note:** `tenantId` IS resolved via `user_tenants` inside the idempotency block (L125-130) but is **never used** in the entity fetches/updates that follow.

### Recommended Fix — `approve-expense`

```typescript
// After resolving tenantId (move resolution BEFORE entity fetches):
const { data: tenantRow } = await supabaseAdmin
  .from('user_tenants')
  .select('tenant_id')
  .eq('user_id', userId)
  .maybeSingle();
const tenantId = tenantRow?.tenant_id;
if (!tenantId) {
  return new Response(JSON.stringify({ success: false, error: 'No tenant', code: 'NO_TENANT' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// L149 — fix:
const { data: expense } = await supabaseAdmin
  .from('expenses')
  .select('*, expense_categories(name)')
  .eq('id', approvalData.expense_id)
  .eq('tenant_id', tenantId)   // ← ADD
  .single();

// L194 — fix:
await supabaseAdmin
  .from('expenses')
  .update(updateData)
  .eq('id', approvalData.expense_id)
  .eq('tenant_id', tenantId);  // ← ADD

// L210 — fix:
const { data: register } = await supabaseAdmin
  .from('cash_registers')
  .select('current_balance')
  .eq('id', expense.register_id)
  .eq('tenant_id', tenantId)   // ← ADD
  .single();

// L219 — fix:
await supabaseAdmin
  .from('cash_registers')
  .update({ current_balance: newBalance })
  .eq('id', expense.register_id)
  .eq('tenant_id', tenantId);  // ← ADD
```

---

## 2. `approve-invoice`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `respHeaders` (includes corsHeaders) on all paths |
| P2 | ✅ | `supabase.auth.getClaims(token)` — L51 |
| P3 | ✅ | Action enum validated (L90-94); rejection reason enforced (L98-103) |
| P4 | ⚠️ | Invoice fetch/updates use **user-scoped** client (`supabase`, not `supabaseAdmin`), so RLS applies — partially mitigated, but no explicit tenant guard |
| P5 | ✅ | `check_rate_limit` RPC — L63-74 |
| P6 | ✅ | `checkIdempotency` — L121-143 |
| P7 | ❌ | Catch block at **L321** leaks raw `error.message`: `error instanceof Error ? error.message : 'Internal server error'` |
| P8 | ✅ | No `execute_sql` |

### P7 Failure — `approve-invoice`

```typescript
// Line 315-324 — CURRENT (leaks raw DB/internal message):
} catch (error) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error', // ← LEAKS
      code: 'INTERNAL_ERROR'
    }),
```

```typescript
// FIXED:
} catch (error) {
  console.error('[approve-invoice] Error:', error);
  return new Response(
    JSON.stringify({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }),
    { status: 500, headers: respHeaders }
  );
}
```

---

## 3. `create-journal`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `respHeaders` on all return paths |
| P2 | ✅ | `supabase.auth.getClaims(token)` — L64 |
| P3 | ⚠️ | Validates date/description/entries count and debit=credit balance, but no UUID validation on `account_id`; entry amounts not validated as non-negative numbers |
| P4 | ❌ | **3 missing tenant filters** (see below) — `tenantId` resolved but never used in any DB query |
| P5 | ✅ | `check_rate_limit` RPC — L76-87 |
| P6 | ✅ | `checkIdempotency` — L90-112 |
| P7 | ✅ | Catch returns `'Internal server error'` — L279 |
| P8 | ✅ | No `execute_sql` |

### P4 Failures — `create-journal`

| Line | Query | Issue |
|------|-------|-------|
| 166–172 | `fiscal_periods` — no `.eq('tenant_id', tenantId)` | Any matching open period from any tenant is used; cross-tenant period could be selected |
| 187–191 | `chart_of_accounts` — no `.eq('tenant_id', tenantId)` | Attacker can validate accounts belonging to another tenant |
| 217–229 | `journals` insert — no `tenant_id` field | Journal row has no tenant association |

### Recommended Fix — `create-journal`

```typescript
// Resolve tenantId BEFORE period/account lookups (move L91-97 block earlier):
const { data: tenantRow } = await supabaseAdmin
  .from('user_tenants')
  .select('tenant_id')
  .eq('user_id', userId)
  .limit(1)
  .maybeSingle();
const tenantId = tenantRow?.tenant_id;
if (!tenantId) {
  return new Response(JSON.stringify({ success: false, error: 'No tenant', code: 'NO_TENANT' }),
    { status: 403, headers: respHeaders });
}

// L166 — fix:
const { data: period } = await supabaseAdmin
  .from('fiscal_periods')
  .select('id, name')
  .eq('tenant_id', tenantId)   // ← ADD
  .eq('is_closed', false)
  .gte('end_date', journal_date)
  .lte('start_date', journal_date)
  .single();

// L187 — fix:
const { data: accounts } = await supabaseAdmin
  .from('chart_of_accounts')
  .select('id, code, name, is_active')
  .eq('tenant_id', tenantId)   // ← ADD
  .in('id', accountIds);

// L217 — fix (add tenant_id to insert):
const { data: journal } = await supabaseAdmin
  .from('journals')
  .insert({
    tenant_id: tenantId,       // ← ADD
    fiscal_period_id: period.id,
    journal_date,
    description,
    // ...rest of fields
  })
```

---

## 4. `event-dispatcher`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `jsonResponse` helper always spreads `corsHeaders` |
| P2 | ✅ | Dual auth: `x-dispatcher-secret` header **or** `auth.getUser()` + platform role check (L94-128) |
| P3 | ⚠️ | `batch_size` validated with numeric bounds (L137); event payload fields not validated |
| P4 | ❌ | `user_roles` queries in `handleEvent` at **L395** and **L413** lack `.eq('tenant_id', tenant_id)` — cross-tenant admins notified |
| P5 | ❌ | No `check_rate_limit` call |
| P6 | ⚠️ | No explicit `checkIdempotency`; dedup delegated to `claim_pending_events` RPC at DB level — acceptable for background processor |
| P7 | ✅ | Catch returns `'Internal error'` — L305 |
| P8 | ✅ | No `execute_sql` |

### P4 Failures — `event-dispatcher`

| Line | Query | Issue |
|------|-------|-------|
| 395–398 | `user_roles` `.eq('role', 'admin')` — no tenant filter | Notifies admins from **all** tenants when any tenant's customer exceeds credit |
| 413–418 | `user_roles` `.in('role', ['admin','manager'])` — no tenant filter | Notifies managers from all tenants on stock depletion |

### Recommended Fix — `event-dispatcher`

```typescript
// In handleEvent(), L395 — fix:
const { data: admins } = await supabase
  .from('user_roles')
  .select('user_id')
  .eq('role', 'admin')
  .eq('tenant_id', tenant_id);   // ← ADD (tenant_id is from event payload)

// L413 — fix:
const { data: admins } = await supabase
  .from('user_roles')
  .select('user_id')
  .in('role', ['admin', 'manager'])
  .eq('tenant_id', tenant_id);   // ← ADD
```

> **P5 Note:** This function is invoked by a secret-authenticated cron job. Rate limiting per-user is architecturally inappropriate here. Recommend documenting this exemption explicitly in a code comment rather than adding `check_rate_limit`.

---

## 5. `export-customers`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `corsHeaders` spread on all return paths |
| P2 | ⚠️ | Uses `userClient.auth.getUser()` (**L29**) instead of `getClaims(token)` — differs from required pattern; still validates the token server-side |
| P3 | ⚠️ | No body to validate (GET-style), but auth check is present |
| P4 | ✅ | Customers fetch at **L99** uses `.eq('tenant_id', tenantId)` ✅ |
| P5 | ❌ | No `check_rate_limit` call — export is resource-intensive (full table scan + storage upload) |
| P6 | ❌ | No idempotency — repeated calls create repeated exports (acceptable for reads, but storage accumulation risk) |
| P7 | ❌ | **L108**: `{ error: fetchError.message }` — raw DB error exposed; **L157**: `'Upload failed: ${uploadError.message}'` — raw storage message exposed |
| P8 | ✅ | No `execute_sql` |

### P7 Fix — `export-customers`

```typescript
// L105-109 — CURRENT:
if (fetchError) {
  return new Response(JSON.stringify({ error: fetchError.message }), { // ← LEAKS
    status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// FIXED:
if (fetchError) {
  console.error('Fetch error:', fetchError.message);
  return new Response(JSON.stringify({ error: 'Failed to retrieve customer data', code: 'FETCH_ERROR' }), {
    status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// L155-159 — fix similarly:
if (uploadError) {
  console.error('Upload error:', uploadError.message);
  return new Response(JSON.stringify({ error: 'Export storage failed', code: 'UPLOAD_ERROR' }), {
    status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

### P2 Fix — `export-customers`

```typescript
// Replace L29:
const { data: { user }, error: authError } = await userClient.auth.getUser()

// With getClaims pattern (consistent with other functions):
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
const userId = claimsData.claims.sub as string;
```

---

## 6. `log-event`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `corsHeaders` on all return paths |
| P2 | ⚠️ | Uses `supabase.auth.getUser(token)` (**L43**) with **service-role** client — token validated correctly, but diverges from required `getClaims` pattern |
| P3 | ✅ | Validates `level`/`message` presence, message ≤500 chars, metadata ≤2KB (L54-73) |
| P4 | ✅ | No cross-tenant entity fetches; `slow_queries_log` insert uses `tenant_id` from resolved `tenantId` |
| P5 | ❌ | No `check_rate_limit` — high-volume endpoint susceptible to log flooding despite size limits |
| P6 | ❌ | No idempotency (write-once log semantics, acceptable) |
| P7 | ✅ | Catch returns `'Internal error'` — L113 |
| P8 | ✅ | No `execute_sql` |

### P2 Fix — `log-event`

```typescript
// Replace L43:
const { data: userData, error: authError } = await supabase.auth.getUser(token);
if (authError || !userData?.user) { ... }
const userId = userData.user.id;

// With getClaims using a separate anon-key client:
const userClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
);
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
const userId = claimsData.claims.sub as string;
```

---

## 7. `process-payment`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `respHeaders` on all return paths |
| P2 | ✅ | `supabaseAuth.auth.getClaims(token)` — L68 |
| P3 | ⚠️ | Checks `paymentData` present (L100-105) but no validation that `amount > 0`, `payment_method` is one of the enum, or `customer_id` is a valid UUID |
| P4 | ❌ | **3 missing tenant filters** (see below) |
| P5 | ✅ | `check_rate_limit` RPC — L84-95 |
| P6 | ✅ | `checkIdempotency` — L132-146 |
| P7 | ✅ | Catch returns `'Internal server error'` — L307 |
| P8 | ✅ | No `execute_sql` |

### P4 Failures — `process-payment`

| Line | Query | Issue |
|------|-------|-------|
| 150–154 | `customers` `.eq('id', paymentData.customer_id)` | No tenant filter — payment can be applied to any tenant's customer |
| 167–171 | `invoices` `.eq('id', paymentData.invoice_id)` | No tenant filter — cross-tenant invoice look-up; overpayment exploitation possible |
| 241–245 | `customers` re-fetch `.eq('id', paymentData.customer_id)` | No tenant filter |

> `tenantId` **is resolved** at L123-129 (used for idempotency and auto-posting) but is never passed to these three DB queries.

### Recommended Fix — `process-payment`

```typescript
// L150 — fix:
const { data: customer } = await supabaseAdmin
  .from('customers')
  .select('id, name, current_balance')
  .eq('id', paymentData.customer_id)
  .eq('tenant_id', tenantId)    // ← ADD
  .single();

// L167 — fix:
const { data: invoiceData } = await supabaseAdmin
  .from('invoices')
  .select('id, invoice_number, total_amount, paid_amount, payment_status')
  .eq('id', paymentData.invoice_id)
  .eq('tenant_id', tenantId)    // ← ADD
  .single();

// L241 — fix:
const { data: updatedCustomer } = await supabaseAdmin
  .from('customers')
  .select('current_balance')
  .eq('id', paymentData.customer_id)
  .eq('tenant_id', tenantId)    // ← ADD
  .single();
```

---

## 8. `render-pdf`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `corsHeaders` on all return paths |
| P2 | ⚠️ | Uses `supabase.auth.getUser()` (**L63**) instead of `getClaims(token)` — different from required pattern |
| P3 | ⚠️ | Only validates `docType` present (L72-77); `data` payload is `Record<string, unknown>` with no validation |
| P4 | ✅ | `pdf_export_jobs` insert includes `tenant_id: tenantId` — L93 |
| P5 | ❌ | No `check_rate_limit` — enqueuing many jobs could exhaust worker capacity |
| P6 | ❌ | No `checkIdempotency` — identical retry enqueues duplicate jobs; worker processes both |
| P7 | ❌ | **L105**: `{ error: insertErr.message }` — raw DB error exposed to caller |
| P8 | ✅ | No `execute_sql` |

### Recommended Fixes — `render-pdf`

```typescript
// P7 fix — L104-108:
if (insertErr) {
  console.error('[render-pdf] Insert error:', insertErr);
  return new Response(JSON.stringify({ error: 'Failed to enqueue job', code: 'ENQUEUE_FAILED' }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// P6 fix — add idempotency before insert (import from _shared):
import { checkIdempotency, getIdempotencyKey } from '../_shared/idempotency.ts';
// ...
const idempotencyKey = getIdempotencyKey(req);
if (idempotencyKey && tenantId) {
  const guard = await supabaseAdminClient.rpc('check_idempotency', {
    // or use checkIdempotency() helper
  });
  if (guard.duplicate) {
    return new Response(JSON.stringify({ ok: false, error: 'Duplicate request', code: 'IDEMPOTENT_REPLAY' }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
```

---

## 9. `restore-backup`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `jsonResponse` always includes `corsHeaders` |
| P2 | ✅ | `supabaseAuth.auth.getClaims(token)` — L178 |
| P3 | ✅ | Validates `data`, `tables` (array, non-empty), `mode` (enum), `confirm_replace` for replace mode (L241-259) |
| P4 | ✅ | Tenant-id forced-rewrite on every row (L430); cross-tenant rows rejected (L410-423); delete/insert scoped to `tenantId` |
| P5 | ❌ | No `check_rate_limit` — replace mode wipes and re-inserts entire tables |
| P6 | ✅ | `checkIdempotency` — L220-231 |
| P7 | ❌ | **L547**: catch block returns `{ error: message }` where `message` is the raw `Error.message` |
| P8 | ✅ | No `execute_sql` |

### P7 Fix — `restore-backup`

```typescript
// L544-548 — CURRENT:
} catch (err) {
  const message = err instanceof Error ? err.message : "unknown error";
  console.error("[restore-backup] unexpected:", message);
  return jsonResponse({ success: false, error: message, code: "UNEXPECTED" }, 500); // ← LEAKS

// FIXED:
} catch (err) {
  console.error("[restore-backup] unexpected:", err);
  return jsonResponse({ success: false, error: "Internal server error", code: "UNEXPECTED" }, 500);
}
```

---

## 10. `rollback-restore`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `jsonResponse` always includes `corsHeaders` |
| P2 | ✅ | `supabaseAuth.auth.getClaims(token)` — L65 |
| P3 | ✅ | Validates `snapshot_id` present and is a string (L81-86) |
| P4 | ✅ | Ownership verified against `snap.tenant_id` (L121-128); all inserts/deletes scoped to `tenantId` from snapshot |
| P5 | ❌ | No `check_rate_limit` — highly destructive operation (wipes and re-inserts all tables) |
| P6 | ❌ | No `checkIdempotency` — a double rollback call wipes restored data and re-restores stale snapshot; snapshot `status` check (L101-110) partially guards this but is not atomic |
| P7 | ❌ | **L142**: `{ error: 'تعذّر تنزيل ملف النسخة: ${dlErr?.message}' }` — raw storage error exposed; **L251**: `{ error: message }` — raw error in outer catch |
| P8 | ✅ | No `execute_sql` |

### Recommended Fixes — `rollback-restore`

```typescript
// P7 fix — L140-144:
if (dlErr || !fileData) {
  console.error('[rollback-restore] Download failed:', dlErr);
  return jsonResponse({ success: false, error: 'Failed to retrieve snapshot file', code: 'DOWNLOAD_FAILED' }, 500);
}

// P7 fix — L248-252:
} catch (err) {
  console.error("[rollback-restore] unexpected:", err);
  return jsonResponse({ success: false, error: 'Internal server error', code: 'UNEXPECTED' }, 500);
}

// P6 fix — add idempotency key check and/or use DB-level lock:
// Before L174 (delete loop), mark snapshot as 'rolling_back' atomically:
const { error: lockErr } = await supabaseAdmin
  .from('restore_snapshots')
  .update({ status: 'rolling_back' })
  .eq('id', snapshotId)
  .eq('status', 'active');  // CAS-style: only succeeds if still active
if (lockErr) {
  return jsonResponse({ success: false, error: 'Snapshot already in progress', code: 'CONCURRENT_ROLLBACK' }, 409);
}
```

---

## 11. `stock-movement`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `corsHeaders` on all return paths |
| P2 | ✅ | `supabaseAuth.auth.getClaims(token)` — L65 |
| P3 | ⚠️ | Validates `product_id`, `movement_type`, `quantity > 0`, warehouse combinations (L105-134); no UUID format check; movement_type not validated against enum |
| P4 | ❌ | **5 missing tenant filters** (see below) |
| P5 | ✅ | `check_rate_limit` RPC — L81-92 |
| P6 | ✅ | `checkIdempotency` — L152-173 |
| P7 | ✅ | Catch returns `'Internal server error'` — L312 |
| P8 | ✅ | No `execute_sql` |

### P4 Failures — `stock-movement`

| Line | Query | Issue |
|------|-------|-------|
| 176–180 | `products` `.eq('id', movementData.product_id)` | No tenant filter — can validate and operate on products from another tenant |
| 192–197 | `product_stock` `.eq('product_id', ...)` `.eq('warehouse_id', ...)` | No tenant filter |
| 219–234 | `stock_movements` insert — no `tenant_id` field | Movement record has no tenant association |
| 249–254 | `product_stock` `.eq('product_id', ...)` `.eq('warehouse_id', ...)` | No tenant filter |
| 266–271 | `product_stock` `.eq('product_id', ...)` `.eq('warehouse_id', ...)` | No tenant filter |

> `tenantId` is resolved inside the idempotency block (L155-160) but is **never used** in any of the entity fetch/mutate queries.

### Recommended Fix — `stock-movement`

```typescript
// Resolve tenantId BEFORE entity queries (move earlier, not inside idemKey block):
const { data: tenantRow } = await supabaseAdmin
  .from('user_tenants')
  .select('tenant_id')
  .eq('user_id', userId)
  .maybeSingle();
const tenantId = tenantRow?.tenant_id;
if (!tenantId) {
  return new Response(JSON.stringify({ success: false, error: 'No tenant', code: 'NO_TENANT' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// L176 — fix:
const { data: product } = await supabaseAdmin
  .from('products')
  .select('id, name, is_active')
  .eq('id', movementData.product_id)
  .eq('tenant_id', tenantId)   // ← ADD
  .single();

// L219 — fix (add tenant_id to insert):
const { data: movement } = await supabaseAdmin
  .from('stock_movements')
  .insert({
    tenant_id: tenantId,       // ← ADD
    product_id: movementData.product_id,
    // ...rest of fields
  })

// All product_stock queries — add .eq('tenant_id', tenantId) to each
```

---

## 12. `validate-invoice`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `corsHeaders` on all return paths |
| P2 | ✅ | `supabaseAuth.auth.getClaims(token)` — L65 |
| P3 | ⚠️ | Checks `invoice_data` present; no validation on `customer_id` format, `total_amount ≥ 0`, or item field types |
| P4 | ❌ | **2 missing tenant filters** (see below) |
| P5 | ✅ | `check_rate_limit` RPC — L83-94 |
| P6 | ❌ | No idempotency — read-only validation, acceptable |
| P7 | ✅ | Catch returns `'Internal server error'` — L272 |
| P8 | ✅ | No `execute_sql` |

### P4 Failures — `validate-invoice`

| Line | Query | Issue |
|------|-------|-------|
| 163–167 | `customers` `.eq('id', invoiceData.customer_id)` | No tenant filter — can read credit limit / balance of any tenant's customer |
| 215–218 | `products` `.in('id', productIds)` | No tenant filter — inactive-product check can reference cross-tenant products |

### Recommended Fix — `validate-invoice`

```typescript
// Resolve tenantId before queries (add after rate limit check):
const { data: tenantRow } = await supabaseAdmin
  .from('user_tenants')
  .select('tenant_id')
  .eq('user_id', userId)
  .maybeSingle();
const tenantId = tenantRow?.tenant_id;

// L163 — fix:
const { data: customer } = await supabaseAdmin
  .from('customers')
  .select('credit_limit, current_balance, name')
  .eq('id', invoiceData.customer_id)
  .eq('tenant_id', tenantId)   // ← ADD
  .single();

// L215 — fix:
const { data: products } = await supabaseAdmin
  .from('products')
  .select('id, name, is_active')
  .eq('tenant_id', tenantId)   // ← ADD
  .in('id', productIds);
```

---

## 13. `verify-totp`

| P | Status | Notes |
|---|--------|-------|
| P1 | ✅ | `corsHeaders` on all return paths |
| P2 | ✅ | `supabase.auth.getClaims(token)` — L149 |
| P3 | ⚠️ | `action` field not validated against allowed enum before use; unknown action falls through to generic 400 |
| P4 | ✅ | All `user_2fa_settings` queries scoped to `userId` — no cross-tenant risk (user-personal data) |
| P5 | ✅ | `check_rate_limit` RPC — L162-173 |
| P6 | ❌ | No idempotency for `enable`/`disable` — a double-enable is harmless; a double-disable could race |
| P7 | ❌ | Catch at **L384**: `error instanceof Error ? error.message : 'Internal server error'` — leaks raw error message |
| P8 | ✅ | No `execute_sql` |

### P7 Fix — `verify-totp`

```typescript
// Line 382-391 — CURRENT:
} catch (error) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error', // ← LEAKS
```

```typescript
// FIXED:
} catch (error) {
  console.error('[verify-totp] Error:', error);
  return new Response(
    JSON.stringify({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## Critical Fixes Table

| # | Function | Pattern | Severity | Description |
|---|----------|---------|----------|-------------|
| 1 | `approve-expense` | P4 | 🔴 CRITICAL | L149: `expenses` fetch by id only — cross-tenant expense approval possible |
| 2 | `approve-expense` | P4 | 🔴 CRITICAL | L194: `expenses` update by id only — cross-tenant state mutation |
| 3 | `approve-expense` | P4 | 🔴 CRITICAL | L210,219: `cash_registers` fetch/update — cross-tenant balance manipulation |
| 4 | `process-payment` | P4 | 🔴 CRITICAL | L150: `customers` fetch by id — payment applied to any tenant's customer |
| 5 | `process-payment` | P4 | 🔴 CRITICAL | L167: `invoices` fetch by id — cross-tenant invoice accessed; overpayment exploit |
| 6 | `stock-movement` | P4 | 🔴 CRITICAL | L176: `products` fetch by id — cross-tenant product validation |
| 7 | `stock-movement` | P4 | 🔴 CRITICAL | L192,249,254,266: `product_stock` — cross-tenant inventory read/mutate |
| 8 | `stock-movement` | P4 | 🔴 CRITICAL | L219: `stock_movements` insert — no `tenant_id`, row unscoped |
| 9 | `validate-invoice` | P4 | 🔴 CRITICAL | L163: `customers` — cross-tenant credit limit exposure |
| 10 | `validate-invoice` | P4 | 🔴 CRITICAL | L215: `products` — cross-tenant product inspection |
| 11 | `create-journal` | P4 | 🔴 CRITICAL | L166: `fiscal_periods` — cross-tenant period used for journal |
| 12 | `create-journal` | P4 | 🔴 CRITICAL | L187: `chart_of_accounts` — cross-tenant accounts used in journal |
| 13 | `create-journal` | P4 | 🔴 CRITICAL | L217: `journals` insert — no `tenant_id` column |
| 14 | `event-dispatcher` | P4 | 🔴 CRITICAL | L395,413: `user_roles` — cross-tenant admin notification broadcast |
| 15 | `approve-invoice` | P7 | 🟠 HIGH | L321: `error.message` leaked to caller in catch block |
| 16 | `verify-totp` | P7 | 🟠 HIGH | L384: `error.message` leaked to caller in catch block |
| 17 | `rollback-restore` | P7 | 🟠 HIGH | L142,251: raw error messages exposed (storage + outer catch) |
| 18 | `restore-backup` | P7 | 🟠 HIGH | L547: raw error message exposed in outer catch |
| 19 | `render-pdf` | P7 | 🟠 HIGH | L105: `insertErr.message` exposed to caller |
| 20 | `export-customers` | P7 | 🟠 HIGH | L108,157: raw DB/storage error messages exposed |
| 21 | `export-customers` | P2 | 🟠 HIGH | L29: uses `auth.getUser()` instead of `getClaims(token)` |
| 22 | `render-pdf` | P2 | 🟡 MEDIUM | L63: uses `auth.getUser()` instead of `getClaims(token)` |
| 23 | `log-event` | P2 | 🟡 MEDIUM | L43: uses `auth.getUser()` with service-role client instead of `getClaims` |
| 24 | `restore-backup` | P5 | 🟡 MEDIUM | No `check_rate_limit` — replace mode is destructive |
| 25 | `rollback-restore` | P5 | 🟡 MEDIUM | No `check_rate_limit` — highly destructive operation |
| 26 | `export-customers` | P5 | 🟡 MEDIUM | No `check_rate_limit` — table-scan + storage upload per call |
| 27 | `render-pdf` | P5 | 🟡 MEDIUM | No `check_rate_limit` — enqueue spam possible |
| 28 | `log-event` | P5 | 🟡 MEDIUM | No `check_rate_limit` — log flooding despite size limits |
| 29 | `event-dispatcher` | P5 | 🟡 MEDIUM | No `check_rate_limit` — mitigated by secret auth requirement |
| 30 | `rollback-restore` | P6 | 🟡 MEDIUM | No `checkIdempotency` — concurrent rollbacks possible; snapshot status check is non-atomic |
| 31 | `render-pdf` | P6 | 🟡 MEDIUM | No `checkIdempotency` — retries create duplicate queued jobs |
| 32 | `approve-expense` | P3 | 🟢 LOW | Action field not enum-validated (only rejection_reason presence checked) |
| 33 | `create-journal` | P3 | 🟢 LOW | Entry account_id not UUID-validated; amounts not non-negative-checked |
| 34 | `process-payment` | P3 | 🟢 LOW | `amount > 0`, `payment_method` enum, UUID format not validated |
| 35 | `verify-totp` | P3 | 🟢 LOW | Action not validated against enum before use |

---

## Confirmed Known-Broken Functions

| Function | Confirmed? | Specific Gaps Found |
|----------|-----------|---------------------|
| `approve-expense` | ✅ CONFIRMED | L149 expenses, L194 update, L210 cash_registers fetch, L219 cash_registers update — all without tenant filter |
| `validate-invoice` | ✅ CONFIRMED | L163 customers, L215 products — both without tenant filter |
| `process-payment` | ✅ CONFIRMED | L150 customers, L167 invoices, L241 customer re-fetch — all without tenant filter |
| `stock-movement` | ✅ CONFIRMED | L176 products, L192/249/254/266 product_stock, L219 insert missing tenant_id |

### Additional Functions with Critical P4 Failures (Not in Known Set)

| Function | Gap |
|----------|-----|
| `create-journal` | `fiscal_periods`, `chart_of_accounts`, and `journals` insert all missing tenant scope |
| `event-dispatcher` | `user_roles` queries in notification handlers missing tenant scope |

---

## Summary Count by Severity

| Severity | Count | Patterns Involved |
|---------|-------|------------------|
| 🔴 CRITICAL | 14 | P4 (tenant isolation) |
| 🟠 HIGH | 8 | P7 (raw error leaks × 6), P2 (wrong JWT method × 2) |
| 🟡 MEDIUM | 9 | P5 (missing rate limit × 6), P6 (missing idempotency × 2), P2 (wrong JWT method × 1) |
| 🟢 LOW | 4 | P3 (weak body validation × 4) |
| **Total** | **35** | |

### Functions With Zero Critical Issues

| Function | Status |
|----------|--------|
| `approve-invoice` | ✅ P4 OK (RLS-protected); 1 HIGH (P7 leak) |
| `restore-backup` | ✅ P4 OK; 1 HIGH (P7 leak), 1 MEDIUM (P5) |
| `rollback-restore` | ✅ P4 OK; 1 HIGH (P7), 2 MEDIUM (P5, P6) |
| `verify-totp` | ✅ P4 N/A; 1 HIGH (P7 leak) |
| `log-event` | ✅ P4 OK; 1 MEDIUM (P2, P5) |

