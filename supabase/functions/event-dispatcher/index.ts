import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-dispatcher-secret, x-correlation-id',
};

interface DomainEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  attempts: number;
}

const MAX_BATCH = 200;
const DEFAULT_BATCH = 50;
const PER_EVENT_TIMEOUT_MS = 15_000;
const MAX_CONCURRENCY = 8;

const jsonResponse = (body: unknown, status = 200, corr?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(corr ? { 'x-correlation-id': corr } : {}),
    },
  });

const log = (corr: string, level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) => {
  const line = { ts: new Date().toISOString(), corr, level, msg, ...(extra || {}) };
  if (level === 'error') console.error(JSON.stringify(line));
  else if (level === 'warn') console.warn(JSON.stringify(line));
  else console.log(JSON.stringify(line));
};

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

Deno.serve(async (req) => {
  const correlationId =
    req.headers.get('x-correlation-id') || req.headers.get('X-Correlation-Id') || crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, correlationId);
  }

  // ===== Authentication =====
  const expectedSecret = Deno.env.get('DISPATCHER_SECRET');
  const providedSecret = req.headers.get('x-dispatcher-secret');
  const authHeader = req.headers.get('authorization');

  let isAuthorized = false;
  let authMode = 'none';

  if (expectedSecret && providedSecret && providedSecret === expectedSecret) {
    isAuthorized = true;
    authMode = 'secret';
  }

  if (!isAuthorized && authHeader?.startsWith('Bearer ')) {
    try {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: roleData } = await userClient.rpc('get_platform_role', {
          _user_id: userData.user.id,
        });
        // Accept only explicit platform admin roles, not any truthy value
        if (roleData && ['owner', 'admin', 'super_admin'].includes(String(roleData))) {
          isAuthorized = true;
          authMode = `user:${roleData}`;
        }
      }
    } catch (e) {
      log(correlationId, 'warn', 'auth.user_check_failed', { err: (e as Error).message });
    }
  }

  if (!isAuthorized) {
    log(correlationId, 'warn', 'auth.unauthorized');
    return jsonResponse(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      401,
      correlationId,
    );
  }

  // ===== Parse optional body =====
  let batchSize = DEFAULT_BATCH;
  try {
    if (req.headers.get('content-length') && Number(req.headers.get('content-length')) > 0) {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.batch_size === 'number') {
        batchSize = Math.max(1, Math.min(MAX_BATCH, Math.floor(body.batch_size)));
      }
    }
  } catch (_) {
    // ignore
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const startedTotal = Date.now();
  const startedAtIso = new Date(startedTotal).toISOString();

  const recordBatch = async (
    counters: { processed: number; failed: number; skipped: number },
    claimedCount: number,
  ) => {
    const totalMs = Date.now() - startedTotal;
    const { error } = await supabase.rpc('record_dispatcher_batch', {
      _correlation_id: correlationId,
      _processed: counters.processed,
      _failed: counters.failed,
      _skipped: counters.skipped,
      _batch_size: batchSize,
      _claimed_count: claimedCount,
      _total_ms: totalMs,
      _auth_mode: authMode,
      _started_at: startedAtIso,
    });
    if (error) log(correlationId, 'warn', 'batch_record.error', { err: error.message });
    return totalMs;
  };

  try {
    const { data: events, error: claimErr } = await supabase.rpc('claim_pending_events', {
      _batch_size: batchSize,
    });

    if (claimErr) {
      log(correlationId, 'error', 'claim.error', { err: claimErr.message });
      throw claimErr;
    }
    if (!events || events.length === 0) {
      log(correlationId, 'info', 'claim.empty', { auth_mode: authMode });
      await recordBatch({ processed: 0, failed: 0, skipped: 0 }, 0);
      return jsonResponse(
        { success: true, processed: 0, failed: 0, skipped: 0, batch_size: batchSize, correlation_id: correlationId },
        200,
        correlationId,
      );
    }

    log(correlationId, 'info', 'claim.ok', {
      count: events.length,
      auth_mode: authMode,
      batch_size: batchSize,
    });

    const counters = { processed: 0, failed: 0, skipped: 0 };

    await runWithConcurrency(events as DomainEvent[], MAX_CONCURRENCY, async (event) => {
      const startedAt = Date.now();
      let success = false;
      let skipped = false;
      let errMsg: string | null = null;

      try {
        const result = await withTimeout(
          handleEvent(supabase, event, correlationId),
          PER_EVENT_TIMEOUT_MS,
          `event:${event.event_type}:${event.id}`,
        );
        if (result === 'skipped') {
          skipped = true;
          await supabase.rpc('mark_event_processed', {
            _event_id: event.id,
            _new_status: 'processed',
            _error: 'skipped: unknown_event_type',
          });
          counters.skipped++;
        } else {
          await supabase.rpc('mark_event_processed', {
            _event_id: event.id,
            _new_status: 'processed',
            _error: null,
          });
          success = true;
          counters.processed++;
        }
      } catch (err) {
        errMsg = err instanceof Error ? err.message : 'Unknown error';
        log(correlationId, 'error', 'event.failed', {
          event_id: event.id,
          event_type: event.event_type,
          attempts: event.attempts,
          err: errMsg,
        });
        await supabase
          .rpc('mark_event_processed', {
            _event_id: event.id,
            _new_status: 'failed',
            _error: errMsg.slice(0, 500),
          })
          .then(({ error }) => {
            if (error) log(correlationId, 'warn', 'mark_failed.error', { err: error.message });
          });
        counters.failed++;
      } finally {
        const latency = Date.now() - startedAt;
        await supabase
          .rpc('record_event_metric', {
            _event_type: event.event_type,
            _success: success,
            _latency_ms: latency,
          })
          .then(({ error }) => {
            if (error) log(correlationId, 'warn', 'metric.error', { err: error.message });
          });
        log(correlationId, success ? 'info' : skipped ? 'warn' : 'error', 'event.done', {
          event_id: event.id,
          event_type: event.event_type,
          latency_ms: latency,
          success,
          skipped,
        });
      }
    });

    const totalMs = Date.now() - startedTotal;
    log(correlationId, 'info', 'batch.done', { ...counters, total_ms: totalMs });

    return jsonResponse(
      { success: true, ...counters, batch_size: batchSize, total_ms: totalMs },
      200,
      correlationId,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    log(correlationId, 'error', 'fatal', { err: msg });
    return jsonResponse(
      { success: false, error: 'Internal error', correlation_id: correlationId },
      500,
      correlationId,
    );
  }
});

async function handleEvent(
  supabase: SupabaseClient,
  event: DomainEvent,
  corr: string,
): Promise<'ok' | 'skipped'> {
  const { event_type, aggregate_id, payload, tenant_id } = event;
  const p = (payload || {}) as Record<string, unknown>;
  const str = (k: string): string | null => {
    const v = p[k];
    return typeof v === 'string' ? v : v == null ? null : String(v);
  };

  switch (event_type) {
    case 'invoice.approved': {
      const { data: journalRes, error: journalErr } = await supabase.rpc(
        'create_journal_for_invoice',
        { _invoice_id: aggregate_id },
      );
      if (journalErr) throw new Error(`Journal posting failed: ${journalErr.message}`);
      if (journalRes && journalRes.success === false) {
        throw new Error(`Journal posting failed: ${journalRes.error || 'unknown'}`);
      }
      log(corr, 'info', 'invoice.approved.journal', { aggregate_id });

      const createdBy = str('created_by');
      if (createdBy) {
        await supabase
          .from('notifications')
          .insert({
            tenant_id,
            user_id: createdBy,
            title: 'فاتورة معتمدة',
            message: `الفاتورة ${str('invoice_number') ?? ''} اعتُمدت بقيمة ${str('total_amount') ?? ''}`,
            type: 'success',
            link: `/invoices/${aggregate_id}`,
          })
          .then(({ error }) => {
            if (error) log(corr, 'warn', 'notification.fail', { err: error.message });
          });
      }
      return 'ok';
    }
    case 'payment.received': {
      const { data: journalRes, error: journalErr } = await supabase.rpc(
        'create_journal_for_payment',
        { _payment_id: aggregate_id },
      );
      if (journalErr) throw new Error(`Journal posting failed: ${journalErr.message}`);
      if (journalRes && journalRes.success === false) {
        throw new Error(`Journal posting failed: ${journalRes.error || 'unknown'}`);
      }
      log(corr, 'info', 'payment.received.journal', { aggregate_id });
      return 'ok';
    }
    case 'expense.approved': {
      const { data: journalRes, error: journalErr } = await supabase.rpc(
        'create_journal_for_expense',
        { _expense_id: aggregate_id },
      );
      if (journalErr) throw new Error(`Journal posting failed: ${journalErr.message}`);
      if (journalRes && journalRes.success === false) {
        throw new Error(`Journal posting failed: ${journalRes.error || 'unknown'}`);
      }
      log(corr, 'info', 'expense.approved.journal', { aggregate_id });

      const createdBy = str('created_by');
      if (createdBy) {
        await supabase
          .from('notifications')
          .insert({
            tenant_id,
            user_id: createdBy,
            title: 'مصروف معتمد',
            message: `المصروف ${str('expense_number') ?? ''} اعتُمد بقيمة ${str('amount') ?? ''}`,
            type: 'info',
          })
          .then(({ error }) => {
            if (error) log(corr, 'warn', 'notification.fail', { err: error.message });
          });
      }
      return 'ok';
    }
    case 'customer.credit_exceeded': {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (admins && admins.length > 0) {
        const rows = admins.map((a: { user_id: string }) => ({
          tenant_id,
          user_id: a.user_id,
          title: '⚠️ تجاوز حد الائتمان',
          message: `العميل "${str('customer_name') ?? ''}" تجاوز حد الائتمان (الرصيد: ${str('current_balance') ?? ''} / الحد: ${str('credit_limit') ?? ''})`,
          type: 'warning',
          link: `/customers/${aggregate_id}`,
        }));
        const { error } = await supabase.from('notifications').insert(rows);
        if (error) log(corr, 'warn', 'notify.bulk.fail', { err: error.message });
      }
      return 'ok';
    }
    case 'stock.depleted': {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'manager']);
      if (admins && admins.length > 0) {
        const rows = admins.map((a: { user_id: string }) => ({
          tenant_id,
          user_id: a.user_id,
          title: '📦 مخزون منخفض',
          message: `المنتج "${str('product_name') ?? ''}" وصل لمستوى منخفض (${str('current_quantity') ?? ''} / الحد الأدنى ${str('min_stock') ?? ''})`,
          type: 'warning',
          link: `/products/${aggregate_id}`,
        }));
        const { error } = await supabase.from('notifications').insert(rows);
        if (error) log(corr, 'warn', 'notify.bulk.fail', { err: error.message });
      }
      return 'ok';
    }
    default:
      log(corr, 'warn', 'event.unknown', { event_type, event_id: event.id });
      return 'skipped';
  }
}
