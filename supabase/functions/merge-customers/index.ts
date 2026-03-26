import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { primaryId, duplicateId } = await req.json();

    if (!primaryId || !duplicateId || primaryId === duplicateId) {
      return new Response(JSON.stringify({ error: 'Invalid customer IDs' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify both customers exist
    const { data: primary } = await supabase.from('customers').select('id, name').eq('id', primaryId).single();
    const { data: duplicate } = await supabase.from('customers').select('id, name').eq('id', duplicateId).single();

    if (!primary || !duplicate) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transfer all related records to primary customer
    const transfers = [];

    // Transfer invoices
    transfers.push(
      supabase.from('invoices').update({ customer_id: primaryId }).eq('customer_id', duplicateId)
    );

    // Transfer payments
    transfers.push(
      supabase.from('payments').update({ customer_id: primaryId }).eq('customer_id', duplicateId)
    );

    // Transfer sales orders
    transfers.push(
      supabase.from('sales_orders').update({ customer_id: primaryId }).eq('customer_id', duplicateId)
    );

    // Transfer quotations
    transfers.push(
      supabase.from('quotations').update({ customer_id: primaryId }).eq('customer_id', duplicateId)
    );

    // Transfer addresses
    transfers.push(
      supabase.from('customer_addresses').update({ customer_id: primaryId }).eq('customer_id', duplicateId)
    );

    // Transfer communications
    transfers.push(
      supabase.from('customer_communications').update({ customer_id: primaryId }).eq('customer_id', duplicateId)
    );

    // Transfer attachments
    transfers.push(
      supabase.from('attachments').update({ entity_id: primaryId }).eq('entity_type', 'customer').eq('entity_id', duplicateId)
    );

    const results = await Promise.all(transfers);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      return new Response(JSON.stringify({
        error: 'Failed to transfer some records',
        details: errors.map(e => e.error?.message),
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recalculate primary customer balance
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('customer_id', primaryId);
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('customer_id', primaryId);

    const totalInvoiced = (allInvoices || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalPaid = (allPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const newBalance = totalInvoiced - totalPaid;

    await supabase.from('customers').update({ current_balance: newBalance }).eq('id', primaryId);

    // Delete the duplicate customer
    const { error: deleteError } = await supabase.from('customers').delete().eq('id', duplicateId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: 'Failed to delete duplicate', details: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `تم دمج "${duplicate.name}" في "${primary.name}" بنجاح`,
      primaryId,
      deletedId: duplicateId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
