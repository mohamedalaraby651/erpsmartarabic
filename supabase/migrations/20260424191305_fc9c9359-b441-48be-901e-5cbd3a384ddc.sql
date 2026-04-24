-- إنشاء customers_safe view لإخفاء PII عن غير المصرّح لهم
CREATE OR REPLACE VIEW public.customers_safe
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  customer_type,
  category_id,
  vip_level,
  governorate,
  city,
  contact_person,
  contact_person_role,
  is_active,
  image_url,
  facebook_url,
  website_url,
  notes,
  discount_percentage,
  payment_terms_days,
  preferred_payment_method,
  price_list_id,
  invoice_count_cached,
  total_purchases_cached,
  last_transaction_date,
  last_activity_at,
  last_communication_at,
  tenant_id,
  created_at,
  updated_at,
  -- PII masked unless admin/accountant/sales
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
      OR has_role(auth.uid(), 'sales'::app_role)
    THEN phone
    ELSE '********'::text
  END AS phone,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
      OR has_role(auth.uid(), 'sales'::app_role)
    THEN phone2
    ELSE '********'::text
  END AS phone2,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
      OR has_role(auth.uid(), 'sales'::app_role)
    THEN email
    ELSE '********'::text
  END AS email,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
    THEN tax_number
    ELSE '********'::text
  END AS tax_number,
  -- Financial fields masked unless admin/accountant
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
    THEN credit_limit
    ELSE NULL::numeric
  END AS credit_limit,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
    THEN current_balance
    ELSE NULL::numeric
  END AS current_balance
FROM public.customers;

-- صلاحيات: للمستخدمين المصادقين فقط (RLS على الجدول الأصلي يُطبَّق تلقائياً)
REVOKE ALL ON public.customers_safe FROM PUBLIC, anon;
GRANT SELECT ON public.customers_safe TO authenticated;

COMMENT ON VIEW public.customers_safe IS 'PII-masked view of customers. Phone/email/tax_number visible only to admin/accountant/sales. Financial fields visible only to admin/accountant. Uses security_invoker to respect tenant RLS.';