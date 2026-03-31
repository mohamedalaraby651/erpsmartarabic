const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No Authorization header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('User authenticated:', user.id)

    // Get tenant via service role (most reliable - bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    
    let tenantId: string | null = null

    // Query user_tenants directly with service role
    const { data: defaultTenant, error: dtError } = await adminClient
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()

    console.log('Default tenant query:', { data: defaultTenant, error: dtError?.message })

    if (defaultTenant?.tenant_id) {
      tenantId = defaultTenant.tenant_id
    } else {
      // Fallback: any tenant for this user
      const { data: anyTenant } = await adminClient
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      console.log('Any tenant fallback:', anyTenant)
      if (anyTenant?.tenant_id) {
        tenantId = anyTenant.tenant_id
      }
    }

    if (!tenantId) {
      console.error('No tenant found for user:', user.id)
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Using tenant:', tenantId)

    // Fetch all customers for this tenant
    const { data: customers, error: fetchError } = await adminClient
      .from('customers')
      .select('name, phone, email, customer_type, vip_level, governorate, city, current_balance, credit_limit, payment_terms_days, is_active, created_at, total_purchases_cached, invoice_count_cached')
      .eq('tenant_id', tenantId)
      .order('name')

    if (fetchError) {
      console.error('Fetch error:', fetchError.message)
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Customers fetched:', customers?.length)

    // Build CSV with BOM for Arabic support
    const BOM = '\uFEFF'
    const csvHeaders = ['الاسم', 'الهاتف', 'البريد', 'النوع', 'VIP', 'المحافظة', 'المدينة', 'الرصيد', 'حد الائتمان', 'شروط الدفع', 'الحالة', 'تاريخ الإنشاء', 'إجمالي المشتريات', 'عدد الفواتير']

    const typeMap: Record<string, string> = { individual: 'فرد', company: 'شركة', farm: 'مزرعة' }
    const vipMap: Record<string, string> = { regular: 'عادي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' }

    const rows = (customers || []).map(c => [
      c.name,
      c.phone || '',
      c.email || '',
      typeMap[c.customer_type] || c.customer_type,
      vipMap[c.vip_level] || c.vip_level,
      c.governorate || '',
      c.city || '',
      c.current_balance ?? 0,
      c.credit_limit ?? '',
      c.payment_terms_days ?? '',
      c.is_active ? 'نشط' : 'غير نشط',
      c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG') : '',
      c.total_purchases_cached ?? 0,
      c.invoice_count_cached ?? 0,
    ])

    const csvContent = BOM + [
      csvHeaders.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const fileName = `customers_export_${new Date().toISOString().slice(0, 10)}.csv`
    const filePath = `exports/${tenantId}/${fileName}`

    // Upload using Uint8Array for Deno compatibility
    const encoded = new TextEncoder().encode(csvContent)
    const { error: uploadError } = await adminClient.storage
      .from('documents')
      .upload(filePath, encoded, {
        contentType: 'text/csv;charset=utf-8',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError.message)
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get signed URL (valid 1 hour)
    const { data: signedUrl } = await adminClient.storage
      .from('documents')
      .createSignedUrl(filePath, 3600)

    console.log('Export complete, rows:', rows.length)

    return new Response(JSON.stringify({
      success: true,
      url: signedUrl?.signedUrl,
      fileName,
      rowCount: rows.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Unexpected error:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
