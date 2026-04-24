import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Atomic claim with FOR UPDATE SKIP LOCKED + attempts increment
    const { data: events, error: claimErr } = await supabase
      .rpc('claim_pending_events', { _batch_size: 50 });

    if (claimErr) throw claimErr;
    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = { processed: 0, failed: 0 };

    for (const event of events as DomainEvent[]) {
      const startedAt = Date.now();
      let success = false;

      try {
        await handleEvent(supabase, event);
        const { error: markErr } = await supabase.rpc('mark_event_processed', {
          _event_id: event.id,
          _new_status: 'processed',
          _error: null,
        });
        if (markErr) throw markErr;
        success = true;
        results.processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[event-dispatcher] Failed event ${event.id}:`, msg);
        await supabase.rpc('mark_event_processed', {
          _event_id: event.id,
          _new_status: 'failed',
          _error: msg.slice(0, 500),
        });
        results.failed++;
      } finally {
        // Observability: record metric (best-effort, never throw)
        const latency = Date.now() - startedAt;
        await supabase
          .rpc('record_event_metric', {
            _event_type: event.event_type,
            _success: success,
            _latency_ms: latency,
          })
          .then(({ error }) => {
            if (error) console.warn('[metric] record fail:', error.message);
          });
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[event-dispatcher] Fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleEvent(supabase: ReturnType<typeof createClient>, event: DomainEvent) {
  const { event_type, aggregate_id, payload, tenant_id } = event;

  switch (event_type) {
    case 'invoice.approved': {
      await supabase.from('notifications').insert({
        tenant_id,
        user_id: (payload.created_by as string) || null,
        title: 'فاتورة معتمدة',
        message: `الفاتورة ${payload.invoice_number} اعتُمدت بقيمة ${payload.total_amount}`,
        type: 'success',
        link: `/invoices/${aggregate_id}`,
      }).then(({ error }) => { if (error) console.warn('[event] notification fail:', error.message); });
      break;
    }
    case 'payment.received': {
      // Already handled by triggers — just log
      break;
    }
    case 'expense.approved': {
      await supabase.from('notifications').insert({
        tenant_id,
        user_id: null,
        title: 'مصروف معتمد',
        message: `المصروف ${payload.expense_number} اعتُمد بقيمة ${payload.amount}`,
        type: 'info',
      }).then(({ error }) => { if (error) console.warn('[event] notification fail:', error.message); });
      break;
    }
    case 'customer.credit_exceeded': {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            tenant_id,
            user_id: admin.user_id,
            title: '⚠️ تجاوز حد الائتمان',
            message: `العميل "${payload.customer_name}" تجاوز حد الائتمان (الرصيد: ${payload.current_balance} / الحد: ${payload.credit_limit})`,
            type: 'warning',
            link: `/customers/${aggregate_id}`,
          });
        }
      }
      break;
    }
    case 'stock.depleted': {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'manager']);
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            tenant_id,
            user_id: admin.user_id,
            title: '📦 مخزون منخفض',
            message: `المنتج "${payload.product_name}" وصل لمستوى منخفض (${payload.current_quantity} / الحد الأدنى ${payload.min_stock})`,
            type: 'warning',
            link: `/products/${aggregate_id}`,
          });
        }
      }
      break;
    }
    default:
      console.warn(`[event-dispatcher] Unknown event type: ${event_type}`);
  }
}
