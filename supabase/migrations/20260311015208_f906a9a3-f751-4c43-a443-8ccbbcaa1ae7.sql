
-- Fix security definer views - convert to SECURITY INVOKER
ALTER VIEW public.employees_safe SET (security_invoker = on);
ALTER VIEW public.suppliers_safe SET (security_invoker = on);
