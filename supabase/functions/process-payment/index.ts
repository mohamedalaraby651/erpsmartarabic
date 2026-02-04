import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PaymentData {
  customer_id: string;
  invoice_id?: string;
  amount: number;
  payment_method: 'cash' | 'credit_card' | 'bank_transfer' | 'check';
  payment_number: string;
  reference_number?: string;
  notes?: string;
}

interface PaymentResult {
  success: boolean;
  payment_id?: string;
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[process-payment] Request received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[process-payment] Missing environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('[process-payment] User authenticated:', userId);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Rate Limit Check
    console.log('[process-payment] Checking rate limit...');
    const { data: rateLimitAllowed } = await supabaseAdmin.rpc('check_rate_limit', {
      _user_id: userId,
      _endpoint: 'process-payment'
    });

    if (rateLimitAllowed === false) {
      console.log('[process-payment] Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ success: false, error: 'تم تجاوز حد الطلبات المسموح، حاول لاحقاً', code: 'RATE_LIMITED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const paymentData: PaymentData = body.payment_data;

    if (!paymentData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing payment_data', code: 'MISSING_DATA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check permission
    console.log('[process-payment] Checking section permission...');
    const { data: hasPermission } = await supabaseAdmin.rpc('check_section_permission', {
      _user_id: userId,
      _section: 'payments',
      _action: 'create'
    });

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied', code: 'NO_PERMISSION' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate customer exists
    console.log('[process-payment] Validating customer...');
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, name, current_balance')
      .eq('id', paymentData.customer_id)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. If invoice_id provided, validate invoice
    let invoice = null;
    if (paymentData.invoice_id) {
      console.log('[process-payment] Validating invoice...');
      const { data: invoiceData, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_amount, payment_status')
        .eq('id', paymentData.invoice_id)
        .single();

      if (invoiceError || !invoiceData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invoice not found', code: 'INVOICE_NOT_FOUND' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      invoice = invoiceData;

      // Check if payment amount is valid
      const remainingAmount = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
      if (paymentData.amount > remainingAmount) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Payment amount exceeds invoice balance',
            code: 'AMOUNT_EXCEEDS_BALANCE',
            details: {
              invoice_total: invoice.total_amount,
              already_paid: invoice.paid_amount,
              remaining: remainingAmount,
              requested: paymentData.amount
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Create payment record
    console.log('[process-payment] Creating payment record...');
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        customer_id: paymentData.customer_id,
        invoice_id: paymentData.invoice_id || null,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_number: paymentData.payment_number,
        reference_number: paymentData.reference_number || null,
        notes: paymentData.notes || null,
        created_by: userId,
        payment_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (paymentError) {
      console.error('[process-payment] Error creating payment:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create payment', code: 'CREATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Update customer balance
    console.log('[process-payment] Updating customer balance...');
    const newBalance = (customer.current_balance || 0) - paymentData.amount;
    const { error: balanceError } = await supabaseAdmin
      .from('customers')
      .update({ current_balance: newBalance })
      .eq('id', paymentData.customer_id);

    if (balanceError) {
      console.error('[process-payment] Error updating balance:', balanceError);
      // Don't fail - payment was created
    }

    // 6. Update invoice if provided
    if (invoice) {
      console.log('[process-payment] Updating invoice...');
      const newPaidAmount = (invoice.paid_amount || 0) + paymentData.amount;
      const newPaymentStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 
                               newPaidAmount > 0 ? 'partial' : 'pending';

      const { error: invoiceUpdateError } = await supabaseAdmin
        .from('invoices')
        .update({ 
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus
        })
        .eq('id', invoice.id);

      if (invoiceUpdateError) {
        console.error('[process-payment] Error updating invoice:', invoiceUpdateError);
        // Don't fail - payment was created
      }
    }

    console.log('[process-payment] Payment processed successfully:', payment.id);
    const result: PaymentResult = {
      success: true,
      payment_id: payment.id,
      message: 'Payment processed successfully',
      details: {
        payment_number: payment.payment_number,
        amount: payment.amount,
        customer_new_balance: newBalance
      }
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-payment] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
