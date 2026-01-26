-- Create table for storing user sidebar settings
CREATE TABLE public.user_sidebar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  section_order jsonb DEFAULT '["sales", "inventory", "finance", "system"]'::jsonb,
  collapsed_sections text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sidebar_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own sidebar settings"
ON public.user_sidebar_settings
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own settings
CREATE POLICY "Users can insert own sidebar settings"
ON public.user_sidebar_settings
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own settings
CREATE POLICY "Users can update own sidebar settings"
ON public.user_sidebar_settings
FOR UPDATE
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_sidebar_settings_updated_at
BEFORE UPDATE ON public.user_sidebar_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();