import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkIdempotency, getCorrelationId, getIdempotencyKey } from '../_shared/idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, idempotency-key, x-correlation-id',
  'Access-Control-Expose-Headers': 'x-correlation-id',
};

interface ApproveInvoiceRequest {
  invoice_id: string;
  action: 'approve' | 'reject' | 'submit';
  rejection_reason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const correlationId = getCorrelationId(req);
  const idempotencyKey = getIdempotencyKey(req);
  const respHeaders = { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId };

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: respHeaders }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Create admin client for rate limit check
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: respHeaders }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Rate Limit Check
    console.log('[approve-invoice] Checking rate limit...');
    const { data: rateLimitAllowed } = await supabaseAdmin.rpc('check_rate_limit', {
      _user_id: userId,
      _endpoint: 'approve-invoice'
    });

    if (rateLimitAllowed === false) {
      console.log('[approve-invoice] Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ success: false, error: 'تم تجاوز حد الطلبات المسموح، حاول لاحقاً', code: 'RATE_LIMITED' }),
        { status: 429, headers: respHeaders }
      );
    }

    // Parse request body
    const body: ApproveInvoiceRequest = await req.json();
    const { invoice_id, action, rejection_reason } = body;

    console.log(`[approve-invoice] User ${userId} attempting ${action} on invoice ${invoice_id}`);

    if (!invoice_id || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields', code: 'MISSING_DATA' }),
        { status: 400, headers: respHeaders }
      );
    }

    // Validate action
    if (!['approve', 'reject', 'submit'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action', code: 'INVALID_ACTION' }),
        { status: 400, headers: respHeaders }
      );
    }

    // Rejection requires reason
    if (action === 'reject' && !rejection_reason) {
      return new Response(
        JSON.stringify({ success: false, error: 'يجب إدخال سبب الرفض', code: 'MISSING_REASON' }),
        { status: 400, headers: respHeaders }
      );
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, customers(name)')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('[approve-invoice] Invoice not found:', invoiceError);
      return new Response(
        JSON.stringify({ success: false, error: 'الفاتورة غير موجودة', code: 'INVOICE_NOT_FOUND' }),
        { status: 404, headers: respHeaders }
      );
    }

    // Idempotency guard — prevent double approval/submit on retry
    if (idempotencyKey) {
      const { data: tenantRow } = await supabaseAdmin
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      const tenantId = (tenantRow as { tenant_id?: string } | null)?.tenant_id;
      if (tenantId) {
        const guard = await checkIdempotency(supabaseAdmin, {
          tenantId,
          userId,
          operation: `approve-invoice:${action}`,
          key: idempotencyKey,
        });
        if (guard.duplicate) {
          return new Response(
            JSON.stringify({ success: false, error: 'Duplicate request (idempotency replay)', code: 'IDEMPOTENT_REPLAY' }),
            { status: 409, headers: respHeaders }
          );
        }
      }
    }

    // Check permissions based on action
    if (action === 'submit') {
      // Anyone with edit permission can submit for approval
      const { data: canEdit } = await supabase.rpc('check_section_permission', {
        _user_id: userId,
        _section: 'invoices',
        _action: 'edit'
      });

      if (!canEdit) {
        const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ success: false, error: 'ليس لديك صلاحية لتقديم الفاتورة للموافقة', code: 'NO_PERMISSION' }),
            { status: 403, headers: respHeaders }
          );
        }
      }

      // Validate current status
      if (invoice.approval_status !== 'draft') {
        return new Response(
          JSON.stringify({ success: false, error: 'يمكن تقديم المسودات فقط للموافقة', code: 'INVALID_STATUS' }),
          { status: 400, headers: respHeaders }
        );
      }

      // Submit for approval
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          approval_status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .eq('id', invoice_id);

      if (updateError) {
        console.error('[approve-invoice] Update error:', updateError);
        throw updateError;
      }

      console.log(`[approve-invoice] Invoice ${invoice_id} submitted for approval`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم تقديم الفاتورة للموافقة',
          new_status: 'pending'
        }),
        { status: 200, headers: respHeaders }
      );
    }

    // For approve/reject, need admin or accountant role
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    const { data: isAccountant } = await supabase.rpc('has_role', { _user_id: userId, _role: 'accountant' });

    if (!isAdmin && !isAccountant) {
      return new Response(
        JSON.stringify({ success: false, error: 'ليس لديك صلاحية للموافقة على الفواتير', code: 'NO_PERMISSION' }),
        { status: 403, headers: respHeaders }
      );
    }

    // Prevent self-approval
    if (invoice.created_by === userId && action === 'approve') {
      return new Response(
        JSON.stringify({ success: false, error: 'لا يمكنك الموافقة على فاتورتك الخاصة', code: 'SELF_APPROVAL' }),
        { status: 403, headers: respHeaders }
      );
    }

    // Validate current status
    if (invoice.approval_status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: 'يمكن الموافقة/الرفض على الفواتير المعلقة فقط', code: 'INVALID_STATUS' }),
        { status: 400, headers: respHeaders }
      );
    }

    if (action === 'approve') {
      // Approve the invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userId,
          rejection_reason: null
        })
        .eq('id', invoice_id);

      if (updateError) {
        console.error('[approve-invoice] Approval error:', updateError);
        throw updateError;
      }

      // Create accounting journal entry (auto-posting)
      try {
        // Get current fiscal period
        const { data: period } = await supabase
          .from('fiscal_periods')
          .select('id')
          .eq('is_closed', false)
          .gte('end_date', new Date().toISOString().split('T')[0])
          .lte('start_date', new Date().toISOString().split('T')[0])
          .single();

        if (period) {
          // Get accounts
          const { data: arAccount } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('code', '1130')
            .single();

          const { data: revenueAccount } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('code', '4100')
            .single();

          const { data: vatAccount } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('code', '2120')
            .single();

          if (arAccount && revenueAccount) {
            // Create journal
            const { data: journal, error: journalError } = await supabase
              .from('journals')
              .insert({
                fiscal_period_id: period.id,
                journal_date: new Date().toISOString().split('T')[0],
                description: `فاتورة مبيعات رقم ${invoice.invoice_number} - ${invoice.customers?.name || 'عميل'}`,
                source_type: 'invoice',
                source_id: invoice_id,
                created_by: userId,
                is_posted: true,
                posted_at: new Date().toISOString()
              })
              .select()
              .single();

            if (!journalError && journal) {
              const entries = [];
              let lineNumber = 1;

              // DR: Accounts Receivable
              entries.push({
                journal_id: journal.id,
                account_id: arAccount.id,
                line_number: lineNumber++,
                debit_amount: Number(invoice.total_amount),
                credit_amount: 0,
                memo: `ذمم ${invoice.customers?.name || 'العميل'}`
              });

              // CR: Sales Revenue
              entries.push({
                journal_id: journal.id,
                account_id: revenueAccount.id,
                line_number: lineNumber++,
                debit_amount: 0,
                credit_amount: Number(invoice.subtotal || invoice.total_amount),
                memo: 'إيرادات المبيعات'
              });

              // CR: VAT (if applicable)
              if (vatAccount && Number(invoice.tax_amount) > 0) {
                entries.push({
                  journal_id: journal.id,
                  account_id: vatAccount.id,
                  line_number: lineNumber++,
                  debit_amount: 0,
                  credit_amount: Number(invoice.tax_amount),
                  memo: 'ضريبة القيمة المضافة'
                });
              }

              await supabase.from('journal_entries').insert(entries);
              console.log(`[approve-invoice] Auto-posted journal ${journal.journal_number} for invoice ${invoice_id}`);
            }
          }
        }
      } catch (journalErr) {
        // Log but don't fail the approval
        console.error('[approve-invoice] Journal creation error (non-fatal):', journalErr);
      }

      console.log(`[approve-invoice] Invoice ${invoice_id} approved by ${userId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم اعتماد الفاتورة بنجاح',
          new_status: 'approved'
        }),
        { status: 200, headers: respHeaders }
      );
    }

    if (action === 'reject') {
      // Reject the invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          approval_status: 'rejected',
          rejection_reason: rejection_reason,
          approved_at: null,
          approved_by: null
        })
        .eq('id', invoice_id);

      if (updateError) {
        console.error('[approve-invoice] Rejection error:', updateError);
        throw updateError;
      }

      console.log(`[approve-invoice] Invoice ${invoice_id} rejected by ${userId}: ${rejection_reason}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم رفض الفاتورة',
          new_status: 'rejected'
        }),
        { status: 200, headers: respHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action', code: 'INVALID_ACTION' }),
      { status: 400, headers: respHeaders }
    );

  } catch (error) {
    console.error('[approve-invoice] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: respHeaders }
    );
  }
});
