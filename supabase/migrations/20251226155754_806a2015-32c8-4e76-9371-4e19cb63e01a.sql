-- Create user_dashboard_settings table for customizable dashboard widgets
CREATE TABLE public.user_dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widgets JSONB NOT NULL DEFAULT '[
    {"id": "stats", "title": "الإحصائيات", "enabled": true, "order": 0, "size": "full"},
    {"id": "tasks", "title": "المهام", "enabled": true, "order": 1, "size": "half"},
    {"id": "activities", "title": "آخر الأنشطة", "enabled": true, "order": 2, "size": "half"},
    {"id": "chart", "title": "الرسم البياني", "enabled": true, "order": 3, "size": "full"},
    {"id": "quick_actions", "title": "الإجراءات السريعة", "enabled": true, "order": 4, "size": "full"}
  ]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_dashboard_settings_user_id_unique UNIQUE (user_id)
);

-- Create user_offline_settings table for offline data preferences
CREATE TABLE public.user_offline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled_tables JSONB NOT NULL DEFAULT '["customers", "products", "invoices", "quotations", "suppliers"]'::jsonb,
  sync_on_login BOOLEAN NOT NULL DEFAULT true,
  auto_sync_interval INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_offline_settings_user_id_unique UNIQUE (user_id)
);

-- Create sync_logs table for tracking sync history
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_offline_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_dashboard_settings
CREATE POLICY "Users can view own dashboard settings"
ON public.user_dashboard_settings
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dashboard settings"
ON public.user_dashboard_settings
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dashboard settings"
ON public.user_dashboard_settings
FOR UPDATE
USING (user_id = auth.uid());

-- RLS policies for user_offline_settings
CREATE POLICY "Users can view own offline settings"
ON public.user_offline_settings
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own offline settings"
ON public.user_offline_settings
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own offline settings"
ON public.user_offline_settings
FOR UPDATE
USING (user_id = auth.uid());

-- RLS policies for sync_logs
CREATE POLICY "Users can view own sync logs"
ON public.sync_logs
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sync logs"
ON public.sync_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sync logs"
ON public.sync_logs
FOR DELETE
USING (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_user_dashboard_settings_updated_at
BEFORE UPDATE ON public.user_dashboard_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_offline_settings_updated_at
BEFORE UPDATE ON public.user_offline_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();