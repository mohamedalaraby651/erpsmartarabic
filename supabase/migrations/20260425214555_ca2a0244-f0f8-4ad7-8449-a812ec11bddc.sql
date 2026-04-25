
-- ===== user_2fa_settings: allow owner to read non-secret columns =====
-- Note: TOTP secret remains masked via separate logic; here owner can read enabled flag etc.
DROP POLICY IF EXISTS user_2fa_settings_select ON public.user_2fa_settings;
CREATE POLICY user_2fa_settings_select ON public.user_2fa_settings
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ===== notifications: prevent spoofing user_id =====
DROP POLICY IF EXISTS "System can create notifications for tenant" ON public.notifications;
CREATE POLICY notifications_insert_safe ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ===== customer_notes: enforce author = inserter =====
DROP POLICY IF EXISTS customer_notes_insert ON public.customer_notes;
DROP POLICY IF EXISTS "Users can create customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Authenticated users can insert customer notes" ON public.customer_notes;
CREATE POLICY customer_notes_insert ON public.customer_notes
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND user_id = auth.uid()
);

-- ===== supplier_notes: only author or admin can update/delete =====
DROP POLICY IF EXISTS supplier_notes_update ON public.supplier_notes;
DROP POLICY IF EXISTS "Users can update supplier notes" ON public.supplier_notes;
CREATE POLICY supplier_notes_update ON public.supplier_notes
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS supplier_notes_delete ON public.supplier_notes;
DROP POLICY IF EXISTS "Users can delete supplier notes" ON public.supplier_notes;
CREATE POLICY supplier_notes_delete ON public.supplier_notes
FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
