-- ====================================
-- إصلاح سياسات RLS للجداول المكشوفة
-- Fix RLS policies for exposed tables
-- ====================================

-- 1. إضافة RLS لجدول suspicious_activities (إذا كان جدولاً وليس view)
-- Note: suspicious_activities appears to be a view based on schema, skipping ALTER TABLE

-- 2. تقييد الوصول لجدول custom_roles - Admin only
DROP POLICY IF EXISTS "Authenticated can view custom roles" ON custom_roles;

CREATE POLICY "Admin only view custom roles" 
ON custom_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- 3. تقييد الوصول لجدول role_section_permissions - Admin only for read
DROP POLICY IF EXISTS "Authenticated can view section permissions" ON role_section_permissions;

CREATE POLICY "Admin only view section permissions" 
ON role_section_permissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- 4. تقييد الوصول لجدول role_limits - Admin only for read
DROP POLICY IF EXISTS "Authenticated can view role limits" ON role_limits;

CREATE POLICY "Admin only view role limits" 
ON role_limits 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- 5. تقييد الوصول لجدول section_customizations - Admin only for read
DROP POLICY IF EXISTS "Authenticated can view section customizations" ON section_customizations;

CREATE POLICY "Admin only view section customizations" 
ON section_customizations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- 6. تقييد الوصول لجدول system_settings - Admin only for read
DROP POLICY IF EXISTS "Authenticated can view system settings" ON system_settings;

CREATE POLICY "Admin only view system settings" 
ON system_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));