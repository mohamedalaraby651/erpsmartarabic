
-- Create user_saved_views table for persisting filter views
CREATE TABLE public.user_saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  section TEXT NOT NULL DEFAULT 'customers',
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_saved_views ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved views
CREATE POLICY "Users can view own saved views"
  ON public.user_saved_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own saved views
CREATE POLICY "Users can create own saved views"
  ON public.user_saved_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own saved views
CREATE POLICY "Users can delete own saved views"
  ON public.user_saved_views FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
