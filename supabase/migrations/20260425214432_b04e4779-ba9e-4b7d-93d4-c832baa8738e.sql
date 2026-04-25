
-- ===== employees: enforce tenant isolation on insert/update =====
DROP POLICY IF EXISTS employees_insert_policy ON public.employees;
CREATE POLICY employees_insert_policy ON public.employees
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.check_section_permission(auth.uid(), 'employees', 'create')
  )
);

DROP POLICY IF EXISTS employees_update_policy ON public.employees;
CREATE POLICY employees_update_policy ON public.employees
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.check_section_permission(auth.uid(), 'employees', 'update')
    OR user_id = auth.uid()
  )
)
WITH CHECK (tenant_id = public.get_current_tenant());

-- ===== invoices: enforce tenant on update/delete =====
DROP POLICY IF EXISTS invoices_update_policy ON public.invoices;
CREATE POLICY invoices_update_policy ON public.invoices
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.check_section_permission(auth.uid(), 'invoices', 'update')
  )
)
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS invoices_delete_policy ON public.invoices;
CREATE POLICY invoices_delete_policy ON public.invoices
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.check_section_permission(auth.uid(), 'invoices', 'delete')
  )
);

-- ===== sales_orders: tenant isolation =====
DROP POLICY IF EXISTS sales_orders_update_policy ON public.sales_orders;
CREATE POLICY sales_orders_update_policy ON public.sales_orders
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.check_section_permission(auth.uid(), 'sales_orders', 'update')
  )
)
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS sales_orders_delete_policy ON public.sales_orders;
CREATE POLICY sales_orders_delete_policy ON public.sales_orders
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.check_section_permission(auth.uid(), 'sales_orders', 'delete')
  )
);

-- ===== quotations: tenant isolation =====
DROP POLICY IF EXISTS quotations_update_policy ON public.quotations;
CREATE POLICY quotations_update_policy ON public.quotations
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
    OR public.check_section_permission(auth.uid(), 'quotations', 'update')
  )
)
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS quotations_delete_policy ON public.quotations;
CREATE POLICY quotations_delete_policy ON public.quotations
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.check_section_permission(auth.uid(), 'quotations', 'delete')
  )
);

-- ===== user_roles: tighten admin assign policy =====
DROP POLICY IF EXISTS user_roles_insert_admin_tenant ON public.user_roles;
CREATE POLICY user_roles_insert_admin_tenant ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
      AND ur.tenant_id = public.get_current_tenant()
  )
  AND public.is_tenant_member(user_id, tenant_id)
);

DROP POLICY IF EXISTS user_roles_update_admin_tenant ON public.user_roles;
CREATE POLICY user_roles_update_admin_tenant ON public.user_roles
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS user_roles_select_admin_tenant ON public.user_roles;
CREATE POLICY user_roles_select_admin_tenant ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    tenant_id = public.get_current_tenant()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
);
