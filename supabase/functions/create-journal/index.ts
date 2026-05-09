import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkIdempotency, getCorrelationId, getIdempotencyKey } from '../_shared/idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, idempotency-key, x-correlation-id',
  'Access-Control-Expose-Headers': 'x-correlation-id',
};

interface JournalEntry {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  memo?: string;
}

interface CreateJournalRequest {
  journal_date: string;
  description: string;
  entries: JournalEntry[];
  source_type?: string;
  source_id?: string;
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

    // Create admin client for operations
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
    console.log('[create-journal] Checking rate limit...');
    const { data: rateLimitAllowed } = await supabaseAdmin.rpc('check_rate_limit', {
      _user_id: userId,
      _endpoint: 'create-journal'
    });

    if (rateLimitAllowed === false) {
      console.log('[create-journal] Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ success: false, error: 'تم تجاوز حد الطلبات المسموح، حاول لاحقاً', code: 'RATE_LIMITED' }),
        { status: 429, headers: respHeaders }
      );
    }

    // Idempotency guard — prevent duplicate journal posting on retry
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
          operation: 'create-journal',
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

    // Check permission - only admin or accountant
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    const { data: isAccountant } = await supabaseAdmin.rpc('has_role', { _user_id: userId, _role: 'accountant' });

    if (!isAdmin && !isAccountant) {
      return new Response(
        JSON.stringify({ success: false, error: 'ليس لديك صلاحية لإنشاء قيود محاسبية', code: 'NO_PERMISSION' }),
        { status: 403, headers: respHeaders }
      );
    }

    // Parse request body
    const body: CreateJournalRequest = await req.json();
    const { journal_date, description, entries, source_type, source_id } = body;

    console.log(`[create-journal] User ${userId} creating journal with ${entries?.length || 0} entries`);

    // Validate required fields
    if (!journal_date || !description || !entries || entries.length < 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'يجب إدخال التاريخ والوصف وسطرين على الأقل', 
          code: 'MISSING_DATA' 
        }),
        { status: 400, headers: respHeaders }
      );
    }

    // Validate entries balance
    const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit_amount) || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit_amount) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `القيد غير متوازن: المدين (${totalDebit}) ≠ الدائن (${totalCredit})`, 
          code: 'UNBALANCED' 
        }),
        { status: 400, headers: respHeaders }
      );
    }

    if (totalDebit === 0 && totalCredit === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'لا يمكن إنشاء قيد فارغ', code: 'EMPTY_JOURNAL' }),
        { status: 400, headers: respHeaders }
      );
    }

    // Find open fiscal period
    const { data: period, error: periodError } = await supabaseAdmin
      .from('fiscal_periods')
      .select('id, name')
      .eq('is_closed', false)
      .gte('end_date', journal_date)
      .lte('start_date', journal_date)
      .single();

    if (periodError || !period) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'لا توجد فترة مالية مفتوحة لهذا التاريخ', 
          code: 'NO_PERIOD' 
        }),
        { status: 400, headers: respHeaders }
      );
    }

    // Validate all accounts exist and are active
    const accountIds = [...new Set(entries.map(e => e.account_id))];
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id, code, name, is_active')
      .in('id', accountIds);

    if (accountsError) {
      console.error('[create-journal] Accounts fetch error:', accountsError);
      throw accountsError;
    }

    if (!accounts || accounts.length !== accountIds.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'بعض الحسابات غير موجودة', code: 'INVALID_ACCOUNTS' }),
        { status: 400, headers: respHeaders }
      );
    }

    const inactiveAccounts = accounts.filter(a => !a.is_active);
    if (inactiveAccounts.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `الحسابات التالية غير نشطة: ${inactiveAccounts.map(a => a.name).join(', ')}`, 
          code: 'INACTIVE_ACCOUNTS' 
        }),
        { status: 400, headers: respHeaders }
      );
    }

    // Create journal
    const { data: journal, error: journalError } = await supabaseAdmin
      .from('journals')
      .insert({
        fiscal_period_id: period.id,
        journal_date,
        description,
        source_type: source_type || 'manual',
        source_id: source_id || null,
        created_by: userId,
        is_posted: false
      })
      .select()
      .single();

    if (journalError) {
      console.error('[create-journal] Journal insert error:', journalError);
      throw journalError;
    }

    // Create journal entries
    const entriesData = entries.map((entry, index) => ({
      journal_id: journal.id,
      account_id: entry.account_id,
      line_number: index + 1,
      debit_amount: Number(entry.debit_amount) || 0,
      credit_amount: Number(entry.credit_amount) || 0,
      memo: entry.memo || null
    }));

    const { error: entriesError } = await supabaseAdmin
      .from('journal_entries')
      .insert(entriesData);

    if (entriesError) {
      console.error('[create-journal] Entries insert error:', entriesError);
      // Try to clean up the journal
      await supabaseAdmin.from('journals').delete().eq('id', journal.id);
      throw entriesError;
    }

    console.log(`[create-journal] Created journal ${journal.journal_number} with ${entries.length} entries`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        journal_id: journal.id,
        journal_number: journal.journal_number,
        message: 'تم إنشاء القيد بنجاح'
      }),
      { status: 200, headers: respHeaders }
    );

  } catch (error) {
    // Log full error server-side; never expose raw DB messages to clients.
    console.error('[create-journal] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: respHeaders }
    );
  }
});
