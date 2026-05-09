import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkIdempotency, getIdempotencyKey, getCorrelationId } from "../_shared/idempotency.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key, x-correlation-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type MovementType = 'in' | 'out' | 'transfer' | 'adjustment';

interface StockMovementData {
  product_id: string;
  variant_id?: string;
  movement_type: MovementType;
  quantity: number;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}

interface MovementResult {
  success: boolean;
  movement_id?: string;
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[stock-movement] Request received');

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
    console.log('[stock-movement] User authenticated:', userId);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Rate Limit Check
    console.log('[stock-movement] Checking rate limit...');
    const { data: rateLimitAllowed } = await supabaseAdmin.rpc('check_rate_limit', {
      _user_id: userId,
      _endpoint: 'stock-movement'
    });

    if (rateLimitAllowed === false) {
      console.log('[stock-movement] Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ success: false, error: 'تم تجاوز حد الطلبات المسموح، حاول لاحقاً', code: 'RATE_LIMITED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const movementData: StockMovementData = body.movement_data;

    if (!movementData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing movement_data', code: 'MISSING_DATA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!movementData.product_id || !movementData.movement_type || movementData.quantity <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid movement data', code: 'INVALID_DATA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate warehouse requirements based on movement type
    if (movementData.movement_type === 'transfer') {
      if (!movementData.from_warehouse_id || !movementData.to_warehouse_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Transfer requires from and to warehouse', code: 'MISSING_WAREHOUSE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (movementData.movement_type === 'in' && !movementData.to_warehouse_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Stock in requires destination warehouse', code: 'MISSING_WAREHOUSE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (movementData.movement_type === 'out' && !movementData.from_warehouse_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Stock out requires source warehouse', code: 'MISSING_WAREHOUSE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check permission
    console.log('[stock-movement] Checking permission...');
    const { data: hasPermission } = await supabaseAdmin.rpc('check_section_permission', {
      _user_id: userId,
      _section: 'inventory',
      _action: 'edit'
    });

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied', code: 'NO_PERMISSION' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate product exists
    console.log('[stock-movement] Validating product...');
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, is_active')
      .eq('id', movementData.product_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found', code: 'PRODUCT_NOT_FOUND' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. For outgoing movements, check stock availability
    if (movementData.movement_type === 'out' || movementData.movement_type === 'transfer') {
      console.log('[stock-movement] Checking stock availability...');
      const { data: currentStock } = await supabaseAdmin
        .from('product_stock')
        .select('quantity')
        .eq('product_id', movementData.product_id)
        .eq('warehouse_id', movementData.from_warehouse_id!)
        .maybeSingle();

      const availableQuantity = currentStock?.quantity || 0;
      if (availableQuantity < movementData.quantity) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Insufficient stock',
            code: 'INSUFFICIENT_STOCK',
            details: {
              product_name: product.name,
              available: availableQuantity,
              requested: movementData.quantity
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Create stock movement record
    console.log('[stock-movement] Creating movement record...');
    const { data: movement, error: movementError } = await supabaseAdmin
      .from('stock_movements')
      .insert({
        product_id: movementData.product_id,
        variant_id: movementData.variant_id || null,
        movement_type: movementData.movement_type,
        quantity: movementData.quantity,
        from_warehouse_id: movementData.from_warehouse_id || null,
        to_warehouse_id: movementData.to_warehouse_id || null,
        reference_type: movementData.reference_type || null,
        reference_id: movementData.reference_id || null,
        notes: movementData.notes || null,
        created_by: userId
      })
      .select()
      .single();

    if (movementError) {
      console.error('[stock-movement] Error creating movement:', movementError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create movement', code: 'CREATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Update product_stock table
    console.log('[stock-movement] Updating stock levels...');

    // For outgoing stock (from warehouse)
    if (movementData.from_warehouse_id) {
      const { data: fromStock } = await supabaseAdmin
        .from('product_stock')
        .select('id, quantity')
        .eq('product_id', movementData.product_id)
        .eq('warehouse_id', movementData.from_warehouse_id)
        .maybeSingle();

      if (fromStock) {
        await supabaseAdmin
          .from('product_stock')
          .update({ quantity: fromStock.quantity - movementData.quantity })
          .eq('id', fromStock.id);
      }
    }

    // For incoming stock (to warehouse)
    if (movementData.to_warehouse_id) {
      const { data: toStock } = await supabaseAdmin
        .from('product_stock')
        .select('id, quantity')
        .eq('product_id', movementData.product_id)
        .eq('warehouse_id', movementData.to_warehouse_id)
        .maybeSingle();

      if (toStock) {
        await supabaseAdmin
          .from('product_stock')
          .update({ quantity: toStock.quantity + movementData.quantity })
          .eq('id', toStock.id);
      } else {
        // Create new stock record
        await supabaseAdmin
          .from('product_stock')
          .insert({
            product_id: movementData.product_id,
            variant_id: movementData.variant_id || null,
            warehouse_id: movementData.to_warehouse_id,
            quantity: movementData.quantity
          });
      }
    }

    console.log('[stock-movement] Movement processed successfully:', movement.id);
    const result: MovementResult = {
      success: true,
      movement_id: movement.id,
      message: 'Stock movement processed successfully',
      details: {
        product_name: product.name,
        movement_type: movementData.movement_type,
        quantity: movementData.quantity
      }
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[stock-movement] Unexpected error:', error);
    console.error('[stock-movement] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
