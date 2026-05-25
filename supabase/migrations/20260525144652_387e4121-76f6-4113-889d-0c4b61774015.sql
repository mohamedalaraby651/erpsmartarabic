ALTER TABLE public.tenant_pdf_profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_pdf_profiles;