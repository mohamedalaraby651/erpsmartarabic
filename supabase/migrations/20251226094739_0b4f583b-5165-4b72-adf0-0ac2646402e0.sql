-- جدول سجل النشاطات
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- إضافة حقول جديدة للحدود المالية
ALTER TABLE role_limits ADD COLUMN IF NOT EXISTS max_daily_transactions NUMERIC DEFAULT 999999999;
ALTER TABLE role_limits ADD COLUMN IF NOT EXISTS max_refund_amount NUMERIC DEFAULT 999999999;

-- جدول قوالب التصدير
CREATE TABLE public.export_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  columns JSONB NOT NULL,
  filters JSONB,
  format TEXT DEFAULT 'excel',
  include_logo BOOLEAN DEFAULT true,
  include_company_info BOOLEAN DEFAULT true,
  created_by UUID,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_templates ENABLE ROW LEVEL SECURITY;

-- سياسات سجل النشاطات
CREATE POLICY "Admin can view activity logs" ON public.activity_logs 
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
  
CREATE POLICY "Authenticated can insert activity logs" ON public.activity_logs 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- سياسات قوالب التصدير
CREATE POLICY "Users can view templates" ON public.export_templates 
  FOR SELECT USING (created_by = auth.uid() OR is_default = true OR has_role(auth.uid(), 'admin'));
  
CREATE POLICY "Users can create templates" ON public.export_templates 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own templates" ON public.export_templates 
  FOR UPDATE USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own templates" ON public.export_templates 
  FOR DELETE USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));