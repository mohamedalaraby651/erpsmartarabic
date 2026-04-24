-- Step 1: Drop overly-permissive INSERT policies that shadow the hardened ones
DROP POLICY IF EXISTS "System can insert events" ON public.domain_events;
DROP POLICY IF EXISTS "System can insert audit trail" ON public.audit_trail;
DROP POLICY IF EXISTS "System can insert slow queries" ON public.slow_queries_log;

-- Also try common alternate names (idempotent — IF EXISTS)
DROP POLICY IF EXISTS "Authenticated can insert events" ON public.domain_events;
DROP POLICY IF EXISTS "Authenticated insert audit" ON public.audit_trail;
DROP POLICY IF EXISTS "Auth insert slow log" ON public.slow_queries_log;
DROP POLICY IF EXISTS "Anyone can insert audit" ON public.audit_trail;
DROP POLICY IF EXISTS "Anyone can insert slow queries" ON public.slow_queries_log;
DROP POLICY IF EXISTS "Anyone can insert events" ON public.domain_events;

-- Cleanup duplicate SELECT policy on permission_matrix_cache
DROP POLICY IF EXISTS "Users can view their own permission cache" ON public.permission_matrix_cache;

-- Add missing composite index for payment-invoice lookups
CREATE INDEX IF NOT EXISTS idx_payments_tenant_invoice
  ON public.payments(tenant_id, invoice_id)
  WHERE invoice_id IS NOT NULL;