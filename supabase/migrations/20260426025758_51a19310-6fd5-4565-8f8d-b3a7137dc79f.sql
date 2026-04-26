-- Fix invoices INSERT policy
DROP POLICY IF EXISTS invoices_insert_policy ON public.invoices;
CREATE POLICY invoices_insert_policy ON public.invoices
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND public.check_section_permission(auth.uid(), 'invoices', 'create')
  AND public.check_financial_limit(auth.uid(), 'invoice_amount', total_amount)
);

-- Fix customers INSERT policy
DROP POLICY IF EXISTS customers_insert_policy ON public.customers;
CREATE POLICY customers_insert_policy ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND public.check_section_permission(auth.uid(), 'customers', 'create')
  AND public.check_financial_limit(auth.uid(), 'credit_limit', COALESCE(credit_limit, 0))
);