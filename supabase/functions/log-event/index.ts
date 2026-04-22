import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogPayload {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  endpoint?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: LogPayload = await req.json();

    if (!body.level || !body.message) {
      return new Response(
        JSON.stringify({ error: 'level and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from auth header (best-effort)
    let userId: string | null = null;
    let tenantId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        const { data: ut } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle();
        tenantId = ut?.tenant_id ?? null;
      }
    }

    // Persist slow queries to dedicated table
    if (body.endpoint && body.duration_ms && body.duration_ms >= 500) {
      await supabase.from('slow_queries_log').insert({
        tenant_id: tenantId,
        user_id: userId,
        endpoint: body.endpoint,
        query_name: body.metadata?.query_name as string | undefined,
        duration_ms: body.duration_ms,
        metadata: body.metadata || {},
      });
    }

    // Always echo back for stdout capture (cloud log retention)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    console.log(JSON.stringify({
      ...body,
      user_id: userId,
      tenant_id: tenantId,
      ip,
      timestamp: new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[log-event] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
