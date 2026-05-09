import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkIdempotency, getIdempotencyKey, getCorrelationId } from "../_shared/idempotency.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key, x-correlation-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ApprovalData {
  expense_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

interface ApprovalResult {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[approve-expense] Request received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    console.log('[approve-expense] User authenticated:', userId);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Rate Limit Check
    console.log('[approve-expense] Checking rate limit...');
    const { data: rateLimitAllowed } = await supabaseAdmin.rpc('check_rate_limit', {
      _user_id: userId,
      _endpoint: 'approve-expense'
    });

    if (rateLimitAllowed === false) {
      console.log('[approve-expense] Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ success: false, error: 'تم تجاوز حد الطلبات المسموح، حاول لاحقاً', code: 'RATE_LIMITED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const approvalData: ApprovalData = body;

    if (!approvalData.expense_id || !approvalData.action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing expense_id or action', code: 'MISSING_DATA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (approvalData.action === 'reject' && !approvalData.rejection_reason) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rejection reason is required', code: 'MISSING_REASON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check if user has admin or accountant role
    console.log('[approve-expense] Checking user role...');
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    const { data: isAccountant } = await supabaseAdmin.rpc('has_role', {
      _user_id: userId,
      _role: 'accountant'
    });

    if (!isAdmin && !isAccountant) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only admins and accountants can approve expenses', code: 'NO_PERMISSION' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get expense details
    console.log('[approve-expense] Fetching expense...');
    const { data: expense, error: expenseError } = await supabaseAdmin
      .from('expenses')
      .select('*, expense_categories(name)')
      .eq('id', approvalData.expense_id)
      .single();

    if (expenseError || !expense) {
      return new Response(
        JSON.stringify({ success: false, error: 'Expense not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check current status
    if (expense.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cannot ${approvalData.action} expense with status: ${expense.status}`,
          code: 'INVALID_STATUS',
          details: { current_status: expense.status }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check user is not approving their own expense (unless admin)
    if (!isAdmin && expense.created_by === userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot approve your own expense', code: 'SELF_APPROVAL' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Update expense status
    console.log('[approve-expense] Updating expense status...');
    const updateData: Record<string, unknown> = {
      status: approvalData.action === 'approve' ? 'approved' : 'rejected',
      approved_by: userId
    };

    if (approvalData.action === 'reject') {
      updateData.rejection_reason = approvalData.rejection_reason;
    }

    const { error: updateError } = await supabaseAdmin
      .from('expenses')
      .update(updateData)
      .eq('id', approvalData.expense_id);

    if (updateError) {
      console.error('[approve-expense] Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update expense', code: 'UPDATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. If approved, update cash register balance (if register_id exists)
    if (approvalData.action === 'approve' && expense.register_id) {
      console.log('[approve-expense] Updating cash register balance...');
      const { data: register } = await supabaseAdmin
        .from('cash_registers')
        .select('current_balance')
        .eq('id', expense.register_id)
        .single();

      if (register) {
        const newBalance = (register.current_balance || 0) - expense.amount;
        await supabaseAdmin
          .from('cash_registers')
          .update({ current_balance: newBalance })
          .eq('id', expense.register_id);

        // Create cash transaction record
        await supabaseAdmin
          .from('cash_transactions')
          .insert({
            register_id: expense.register_id,
            transaction_type: 'withdrawal',
            amount: -expense.amount,
            balance_after: newBalance,
            reference_type: 'expense',
            reference_id: expense.id,
            description: `مصروف: ${expense.description || expense.expense_number}`,
            created_by: userId,
            transaction_number: `TXN-${Date.now()}`
          });
      }
    }

    console.log('[approve-expense] Expense processed successfully');
    const result: ApprovalResult = {
      success: true,
      message: approvalData.action === 'approve' ? 
        'تمت الموافقة على المصروف بنجاح' : 
        'تم رفض المصروف',
      details: {
        expense_number: expense.expense_number,
        amount: expense.amount,
        new_status: approvalData.action === 'approve' ? 'approved' : 'rejected'
      }
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[approve-expense] Unexpected error:', error);
    console.error('[approve-expense] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
