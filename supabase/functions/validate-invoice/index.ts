import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface InvoiceData {
  customer_id: string;
  total_amount: number;
  items?: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[validate-invoice] Request received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[validate-invoice] Missing environment variables');
      return new Response(
        JSON.stringify({ valid: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[validate-invoice] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ valid: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user token for auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('[validate-invoice] JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('[validate-invoice] User authenticated:', userId);

    // Create admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Rate Limit Check
    console.log('[validate-invoice] Checking rate limit...');
    const { data: rateLimitAllowed } = await supabaseAdmin.rpc('check_rate_limit', {
      _user_id: userId,
      _endpoint: 'validate-invoice'
    });

    if (rateLimitAllowed === false) {
      console.log('[validate-invoice] Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ valid: false, error: 'تم تجاوز حد الطلبات المسموح، حاول لاحقاً', code: 'RATE_LIMITED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const invoiceData: InvoiceData = body.invoice_data;

    if (!invoiceData) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing invoice_data', code: 'MISSING_DATA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check permission using DB function
    console.log('[validate-invoice] Checking section permission...');
    const { data: hasPermission, error: permError } = await supabaseAdmin.rpc('check_section_permission', {
      _user_id: userId,
      _section: 'invoices',
      _action: 'create'
    });

    if (permError) {
      console.error('[validate-invoice] Permission check error:', permError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Permission check failed', code: 'PERMISSION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hasPermission) {
      console.log('[validate-invoice] Permission denied for user:', userId);
      return new Response(
        JSON.stringify({ valid: false, error: 'Permission denied', code: 'NO_PERMISSION' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check financial limit
    console.log('[validate-invoice] Checking financial limit...');
    const { data: withinLimit, error: limitError } = await supabaseAdmin.rpc('check_financial_limit', {
      _user_id: userId,
      _limit_type: 'invoice',
      _value: invoiceData.total_amount
    });

    if (limitError) {
      console.error('[validate-invoice] Limit check error:', limitError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Limit check failed', code: 'LIMIT_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!withinLimit) {
      console.log('[validate-invoice] Invoice amount exceeds limit:', invoiceData.total_amount);
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Invoice amount exceeds your role limit', 
          code: 'LIMIT_EXCEEDED',
          details: { requested_amount: invoiceData.total_amount }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate customer credit limit
    if (invoiceData.customer_id) {
      console.log('[validate-invoice] Checking customer credit limit...');
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('credit_limit, current_balance, name')
        .eq('id', invoiceData.customer_id)
        .single();

      if (customerError) {
        console.error('[validate-invoice] Customer lookup error:', customerError);
        return new Response(
          JSON.stringify({ valid: false, error: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (customer) {
        const currentBalance = customer.current_balance || 0;
        const creditLimit = customer.credit_limit || 0;
        const newBalance = currentBalance + invoiceData.total_amount;

        if (creditLimit > 0 && newBalance > creditLimit) {
          console.log('[validate-invoice] Customer credit limit exceeded:', {
            customer: customer.name,
            current_balance: currentBalance,
            credit_limit: creditLimit,
            requested: invoiceData.total_amount,
            new_balance: newBalance
          });

          return new Response(
            JSON.stringify({ 
              valid: false,
              error: 'Customer credit limit exceeded',
              code: 'CREDIT_LIMIT_EXCEEDED',
              details: {
                customer_name: customer.name,
                current_balance: currentBalance,
                credit_limit: creditLimit,
                requested_amount: invoiceData.total_amount,
                would_be_balance: newBalance
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 4. Validate products exist and have stock (optional)
    if (invoiceData.items && invoiceData.items.length > 0) {
      console.log('[validate-invoice] Validating products...');
      const productIds = invoiceData.items.map(item => item.product_id);
      
      const { data: products, error: productsError } = await supabaseAdmin
        .from('products')
        .select('id, name, is_active')
        .in('id', productIds);

      if (productsError) {
        console.error('[validate-invoice] Products lookup error:', productsError);
        return new Response(
          JSON.stringify({ valid: false, error: 'Products validation failed', code: 'PRODUCTS_ERROR' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for inactive products
      const inactiveProducts = products?.filter(p => !p.is_active) || [];
      if (inactiveProducts.length > 0) {
        return new Response(
          JSON.stringify({ 
            valid: false,
            error: 'Some products are inactive',
            code: 'INACTIVE_PRODUCTS',
            details: { inactive_products: inactiveProducts.map(p => p.name) }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if all products exist
      const foundProductIds = products?.map(p => p.id) || [];
      const missingProducts = productIds.filter(id => !foundProductIds.includes(id));
      if (missingProducts.length > 0) {
        return new Response(
          JSON.stringify({ 
            valid: false,
            error: 'Some products not found',
            code: 'PRODUCTS_NOT_FOUND',
            details: { missing_product_ids: missingProducts }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[validate-invoice] Validation passed');
    const result: ValidationResult = { 
      valid: true, 
      message: 'Invoice validation passed' 
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[validate-invoice] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage, code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
