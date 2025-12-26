-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS phone2 TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Add image_url to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  phone2 TEXT,
  address TEXT,
  national_id TEXT,
  image_url TEXT,
  job_title TEXT,
  department TEXT,
  hire_date DATE,
  contract_type TEXT DEFAULT 'full_time',
  employment_status TEXT DEFAULT 'active',
  base_salary NUMERIC DEFAULT 0,
  bank_account TEXT,
  birth_date DATE,
  gender TEXT,
  marital_status TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS policies for employees
CREATE POLICY "Admin and HR can manage employees"
ON public.employees FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Employees can view own record"
ON public.employees FOR SELECT
USING (user_id = auth.uid());

-- Create user_notification_settings table
CREATE TABLE public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  low_stock_alerts BOOLEAN DEFAULT true,
  overdue_invoice_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_notification_settings
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_notification_settings
CREATE POLICY "Users can view own notification settings"
ON public.user_notification_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification settings"
ON public.user_notification_settings FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification settings"
ON public.user_notification_settings FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create user_login_history table
CREATE TABLE public.user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  login_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT
);

-- Enable RLS on user_login_history
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_login_history
CREATE POLICY "Users can view own login history"
ON public.user_login_history FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert login history"
ON public.user_login_history FOR INSERT
WITH CHECK (true);

-- Create trigger for employees updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for user_notification_settings updated_at
CREATE TRIGGER update_user_notification_settings_updated_at
BEFORE UPDATE ON public.user_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for avatars and employee images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-images', 'employee-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer-images', 'customer-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('supplier-images', 'supplier-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for employee-images
CREATE POLICY "Employee images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-images');

CREATE POLICY "Admin and HR can upload employee images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

CREATE POLICY "Admin and HR can update employee images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

CREATE POLICY "Admin and HR can delete employee images"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

-- Storage policies for customer-images
CREATE POLICY "Customer images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-images');

CREATE POLICY "Admin and Sales can upload customer images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'customer-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role)));

CREATE POLICY "Admin and Sales can update customer images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'customer-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role)));

CREATE POLICY "Admin and Sales can delete customer images"
ON storage.objects FOR DELETE
USING (bucket_id = 'customer-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role)));

-- Storage policies for supplier-images
CREATE POLICY "Supplier images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'supplier-images');

CREATE POLICY "Admin and Warehouse can upload supplier images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'supplier-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse'::app_role)));

CREATE POLICY "Admin and Warehouse can update supplier images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'supplier-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse'::app_role)));

CREATE POLICY "Admin and Warehouse can delete supplier images"
ON storage.objects FOR DELETE
USING (bucket_id = 'supplier-images' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse'::app_role)));