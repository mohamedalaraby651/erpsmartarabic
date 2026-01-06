-- Create user_preferences table for personal customizations
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Appearance customization
  theme TEXT DEFAULT 'system', -- light, dark, system
  primary_color TEXT DEFAULT '#2563eb',
  accent_color TEXT DEFAULT '#8b5cf6',
  font_family TEXT DEFAULT 'Cairo',
  font_size TEXT DEFAULT 'medium', -- small, medium, large
  sidebar_compact BOOLEAN DEFAULT false,
  
  -- Sidebar customization
  sidebar_order JSONB DEFAULT '[]'::jsonb,
  favorite_pages JSONB DEFAULT '[]'::jsonb,
  collapsed_sections JSONB DEFAULT '[]'::jsonb,
  
  -- Dashboard customization
  dashboard_widgets JSONB,
  
  -- Table settings per page
  table_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Notification settings
  notification_settings JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create system_settings table for admin-level settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL, -- appearance, forms, notifications, reports
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create report_templates table for custom report templates
CREATE TABLE public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- invoice, quotation, sales_order, purchase_order
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for system_settings
CREATE POLICY "Authenticated can view system settings"
ON public.system_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for report_templates
CREATE POLICY "Authenticated can view report templates"
ON public.report_templates FOR SELECT
USING (true);

CREATE POLICY "Admins can manage report templates"
ON public.report_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own templates"
ON public.report_templates FOR ALL
USING (created_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, category, description) VALUES
('default_theme', '"system"', 'appearance', 'الثيم الافتراضي للنظام'),
('default_primary_color', '"#2563eb"', 'appearance', 'اللون الأساسي الافتراضي'),
('default_font_family', '"Cairo"', 'appearance', 'الخط الافتراضي'),
('default_font_size', '"medium"', 'appearance', 'حجم الخط الافتراضي'),
('allow_user_theme_override', 'true', 'appearance', 'السماح للمستخدمين بتغيير الثيم'),
('allow_user_color_override', 'true', 'appearance', 'السماح للمستخدمين بتغيير الألوان');