-- 1. جدول الأدوار المخصصة
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- 2. جدول صلاحيات الأقسام
CREATE TABLE public.role_section_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, section)
);

ALTER TABLE public.role_section_permissions ENABLE ROW LEVEL SECURITY;

-- 3. جدول صلاحيات الحقول
CREATE TABLE public.role_field_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL,
  field_name TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, section, field_name)
);

ALTER TABLE public.role_field_permissions ENABLE ROW LEVEL SECURITY;

-- 4. جدول حدود المبالغ
CREATE TABLE public.role_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  max_discount_percentage NUMERIC DEFAULT 100,
  max_credit_limit NUMERIC DEFAULT 999999999,
  max_invoice_amount NUMERIC DEFAULT 999999999,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.role_limits ENABLE ROW LEVEL SECURITY;

-- 5. جدول تخصيص الأقسام (على مستوى الشركة)
CREATE TABLE public.section_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  field_name TEXT NOT NULL,
  custom_label TEXT,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_custom_field BOOLEAN DEFAULT false,
  field_type TEXT DEFAULT 'text',
  field_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section, field_name)
);

ALTER TABLE public.section_customizations ENABLE ROW LEVEL SECURITY;

-- 6. ربط المستخدمين بالأدوار المخصصة
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.custom_roles(id);

-- RLS Policies for custom_roles
CREATE POLICY "Admins can manage custom roles"
ON public.custom_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view custom roles"
ON public.custom_roles FOR SELECT
USING (true);

-- RLS Policies for role_section_permissions
CREATE POLICY "Admins can manage section permissions"
ON public.role_section_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view section permissions"
ON public.role_section_permissions FOR SELECT
USING (true);

-- RLS Policies for role_field_permissions
CREATE POLICY "Admins can manage field permissions"
ON public.role_field_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view field permissions"
ON public.role_field_permissions FOR SELECT
USING (true);

-- RLS Policies for role_limits
CREATE POLICY "Admins can manage role limits"
ON public.role_limits FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view role limits"
ON public.role_limits FOR SELECT
USING (true);

-- RLS Policies for section_customizations
CREATE POLICY "Admins can manage section customizations"
ON public.section_customizations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view section customizations"
ON public.section_customizations FOR SELECT
USING (true);

-- Insert default custom roles based on existing app_roles
INSERT INTO public.custom_roles (name, description, color, is_system) VALUES
('مدير النظام', 'صلاحيات كاملة على النظام', '#8b5cf6', true),
('موظف مبيعات', 'إدارة العملاء والمبيعات', '#3b82f6', true),
('أمين مخزن', 'إدارة المنتجات والمخزون', '#10b981', true),
('محاسب', 'إدارة الفواتير والتحصيل', '#f59e0b', true),
('موارد بشرية', 'إدارة الموظفين', '#ec4899', true)
ON CONFLICT (name) DO NOTHING;