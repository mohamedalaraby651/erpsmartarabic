-- =============================================
-- PHASE 1.3: UPDATE RLS POLICIES FOR TENANT ISOLATION
-- Part 5: System, Notifications, Roles, Settings
-- =============================================

-- COMPANY SETTINGS TABLE
DROP POLICY IF EXISTS "Admin can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admin can create company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admin can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admin can delete company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON public.company_settings;

CREATE POLICY "Tenant users can view company settings"
    ON public.company_settings FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant admins can create company settings"
    ON public.company_settings FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can update company settings"
    ON public.company_settings FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can delete company settings"
    ON public.company_settings FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Tenant users can view their notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND user_id = auth.uid()
    );

CREATE POLICY "Tenant users can update their notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND user_id = auth.uid()
    );

CREATE POLICY "System can create notifications for tenant"
    ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can delete their notifications"
    ON public.notifications FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND user_id = auth.uid()
    );

-- ATTACHMENTS TABLE
DROP POLICY IF EXISTS "Users can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can create attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can update attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can delete attachments" ON public.attachments;

CREATE POLICY "Tenant users can view attachments"
    ON public.attachments FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can create attachments"
    ON public.attachments FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can update attachments"
    ON public.attachments FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can delete attachments"
    ON public.attachments FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
    );

-- EXPORT TEMPLATES TABLE
DROP POLICY IF EXISTS "Users can view export templates" ON public.export_templates;
DROP POLICY IF EXISTS "Users can create export templates" ON public.export_templates;
DROP POLICY IF EXISTS "Users can update export templates" ON public.export_templates;
DROP POLICY IF EXISTS "Users can delete export templates" ON public.export_templates;

CREATE POLICY "Tenant users can view export templates"
    ON public.export_templates FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can create export templates"
    ON public.export_templates FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can update export templates"
    ON public.export_templates FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    );

CREATE POLICY "Tenant users can delete export templates"
    ON public.export_templates FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    );

-- PUSH SUBSCRIPTIONS TABLE
DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Tenant users can view their push subscriptions"
    ON public.push_subscriptions FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND user_id = auth.uid()
    );

CREATE POLICY "Tenant users can create push subscriptions"
    ON public.push_subscriptions FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND user_id = auth.uid()
    );

CREATE POLICY "Tenant users can update their push subscriptions"
    ON public.push_subscriptions FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND user_id = auth.uid()
    );

CREATE POLICY "Tenant users can delete their push subscriptions"
    ON public.push_subscriptions FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND user_id = auth.uid()
    );

-- ACTIVITY LOGS TABLE
DROP POLICY IF EXISTS "Admin can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can create activity logs" ON public.activity_logs;

CREATE POLICY "Tenant admins can view activity logs"
    ON public.activity_logs FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "System can create activity logs for tenant"
    ON public.activity_logs FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
    );

-- CUSTOM ROLES TABLE
DROP POLICY IF EXISTS "Admin can view custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admin can create custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admin can update custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admin can delete custom roles" ON public.custom_roles;

CREATE POLICY "Tenant admins can view custom roles"
    ON public.custom_roles FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can create custom roles"
    ON public.custom_roles FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can update custom roles"
    ON public.custom_roles FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can delete custom roles"
    ON public.custom_roles FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
        AND NOT is_system
    );

-- ROLE SECTION PERMISSIONS TABLE
DROP POLICY IF EXISTS "Admin can view role permissions" ON public.role_section_permissions;
DROP POLICY IF EXISTS "Admin can create role permissions" ON public.role_section_permissions;
DROP POLICY IF EXISTS "Admin can update role permissions" ON public.role_section_permissions;
DROP POLICY IF EXISTS "Admin can delete role permissions" ON public.role_section_permissions;

CREATE POLICY "Tenant admins can view role permissions"
    ON public.role_section_permissions FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can create role permissions"
    ON public.role_section_permissions FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can update role permissions"
    ON public.role_section_permissions FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can delete role permissions"
    ON public.role_section_permissions FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- ROLE LIMITS TABLE
DROP POLICY IF EXISTS "Admin can view role limits" ON public.role_limits;
DROP POLICY IF EXISTS "Admin can create role limits" ON public.role_limits;
DROP POLICY IF EXISTS "Admin can update role limits" ON public.role_limits;
DROP POLICY IF EXISTS "Admin can delete role limits" ON public.role_limits;

CREATE POLICY "Tenant admins can view role limits"
    ON public.role_limits FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can create role limits"
    ON public.role_limits FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can update role limits"
    ON public.role_limits FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can delete role limits"
    ON public.role_limits FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- SECTION CUSTOMIZATIONS TABLE
DROP POLICY IF EXISTS "Admin can manage section customizations" ON public.section_customizations;

CREATE POLICY "Tenant admins can view section customizations"
    ON public.section_customizations FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can create section customizations"
    ON public.section_customizations FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can update section customizations"
    ON public.section_customizations FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can delete section customizations"
    ON public.section_customizations FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- SYSTEM SETTINGS TABLE
DROP POLICY IF EXISTS "Admin can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin can create system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin can delete system settings" ON public.system_settings;

CREATE POLICY "Tenant admins can view system settings"
    ON public.system_settings FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can create system settings"
    ON public.system_settings FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can update system settings"
    ON public.system_settings FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can delete system settings"
    ON public.system_settings FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- TASKS TABLE
DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON public.tasks;

CREATE POLICY "Tenant users can view tasks"
    ON public.tasks FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can create tasks"
    ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can update tasks"
    ON public.tasks FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Tenant users can delete tasks"
    ON public.tasks FOR DELETE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
    );