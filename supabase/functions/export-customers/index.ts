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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify user JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get tenant - try RPC first, then fallback to direct query
    let tenantId: string | null = null
    
    const { data: tenantData, error: tenantError } = await userClient.rpc('get_current_tenant')
    if (!tenantError && tenantData) {
      tenantId = tenantData
    }

    // Fallback: query user_tenants directly with service role
    if (!tenantId) {
      const adminClientForTenant = createClient(supabaseUrl, supabaseServiceKey)
      const { data: utData } = await adminClientForTenant
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .limit(1)
        .single()
      
      if (utData?.tenant_id) {
        tenantId = utData.tenant_id
      }
    }

    // Final fallback: any tenant for this user
    if (!tenantId) {
      const adminClientForTenant = createClient(supabaseUrl, supabaseServiceKey)
      const { data: utData } = await adminClientForTenant
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()
      
      if (utData?.tenant_id) {
        tenantId = utData.tenant_id
      }
    }

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role to fetch all customers for this tenant
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: customers, error: fetchError } = await adminClient
      .from('customers')
      .select('name, phone, email, customer_type, vip_level, governorate, city, current_balance, credit_limit, payment_terms_days, is_active, created_at, total_purchases_cached, invoice_count_cached')
      .eq('tenant_id', tenantId)
      .order('name')

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

    // Upload to storage using Uint8Array instead of Blob for Deno compatibility
    const encoded = new TextEncoder().encode(csvContent)
    const { error: uploadError } = await adminClient.storage
      .from('documents')
      .upload(filePath, encoded, {
        contentType: 'text/csv;charset=utf-8',
        upsert: true,
      })

    if (uploadError) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get signed URL (valid 1 hour)
    const { data: signedUrl } = await adminClient.storage
      .from('documents')
      .createSignedUrl(filePath, 3600)

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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
