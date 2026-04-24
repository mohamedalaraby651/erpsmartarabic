-- =====================================================
-- STEP 1: SECURITY PATCH
-- =====================================================

-- ----- 1) domain_events: integrity + lockdown -----
ALTER TABLE public.domain_events 
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_events_retry_ready
  ON public.domain_events(next_retry_at, status)
  WHERE status IN ('pending', 'failed');

-- Backfill processed rows missing timestamp before adding constraint
UPDATE public.domain_events 
SET processed_at = COALESCE(processed_at, created_at) 
WHERE status = 'processed' AND processed_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'processed_requires_timestamp'
  ) THEN
    ALTER TABLE public.domain_events
      ADD CONSTRAINT processed_requires_timestamp
      CHECK (status <> 'processed' OR processed_at IS NOT NULL);
  END IF;
END $$;

-- Drop all permissive policies
DROP POLICY IF EXISTS "System can update events" ON public.domain_events;
DROP POLICY IF EXISTS "Authenticated can insert events" ON public.domain_events;
DROP POLICY IF EXISTS "Block client updates on events" ON public.domain_events;
DROP POLICY IF EXISTS "Block client deletes on events" ON public.domain_events;
DROP POLICY IF EXISTS "Tenant-scoped event insert" ON public.domain_events;

-- INSERT: tenant-scoped only
CREATE POLICY "Tenant-scoped event insert" ON public.domain_events
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant()
  );

-- UPDATE/DELETE: blocked from client (only SECURITY DEFINER funcs can write)
CREATE POLICY "Block client updates on events" ON public.domain_events
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Block client deletes on events" ON public.domain_events
  FOR DELETE TO authenticated USING (false);

-- ----- 2) audit_trail: immutable lockdown -----
DROP POLICY IF EXISTS "Authenticated insert audit" ON public.audit_trail;
DROP POLICY IF EXISTS "System inserts audit trail" ON public.audit_trail;
DROP POLICY IF EXISTS "Tenant-scoped audit insert" ON public.audit_trail;
DROP POLICY IF EXISTS "Block all updates on audit" ON public.audit_trail;
DROP POLICY IF EXISTS "Block all deletes on audit" ON public.audit_trail;

CREATE POLICY "Tenant-scoped audit insert" ON public.audit_trail
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (tenant_id = get_current_tenant() OR tenant_id IS NULL)
  );

CREATE POLICY "Block all updates on audit" ON public.audit_trail
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Block all deletes on audit" ON public.audit_trail
  FOR DELETE TO authenticated USING (false);

-- Cleanup function (admin/cron-only)
CREATE OR REPLACE FUNCTION public.purge_old_audit_records()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_trail WHERE created_at < now() - interval '180 days';
END;
$$;

-- ----- 3) slow_queries_log: tenant-scoped insert -----
DROP POLICY IF EXISTS "Auth insert slow log" ON public.slow_queries_log;
DROP POLICY IF EXISTS "System inserts slow queries" ON public.slow_queries_log;
DROP POLICY IF EXISTS "Tenant-scoped slow log" ON public.slow_queries_log;

CREATE POLICY "Tenant-scoped slow log" ON public.slow_queries_log
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (tenant_id = get_current_tenant() OR tenant_id IS NULL)
  );

-- ----- 4) permission_matrix_cache: precise policies -----
DROP POLICY IF EXISTS "System manages permission cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "Admins manage permission cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "Users see own cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "Users read own cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "System inserts cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "Admins update cache" ON public.permission_matrix_cache;
DROP POLICY IF EXISTS "Admins delete cache" ON public.permission_matrix_cache;

CREATE POLICY "Users read own cache" ON public.permission_matrix_cache
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "System inserts cache" ON public.permission_matrix_cache
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins update cache" ON public.permission_matrix_cache
  FOR UPDATE TO authenticated 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete cache" ON public.permission_matrix_cache
  FOR DELETE TO authenticated 
  USING (has_role(auth.uid(), 'admin'));

-- ----- 5) Secure event handling RPCs -----
CREATE OR REPLACE FUNCTION public.claim_pending_events(_batch_size int DEFAULT 50)
RETURNS SETOF public.domain_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id FROM public.domain_events
    WHERE status IN ('pending', 'failed')
      AND attempts < 5
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY created_at ASC
    LIMIT _batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.domain_events de
  SET 
    status = 'processing',
    attempts = de.attempts + 1
  FROM claimed
  WHERE de.id = claimed.id
  RETURNING de.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_event_processed(
  _event_id uuid, 
  _new_status text, 
  _error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _current_attempts int;
BEGIN
  IF _new_status = 'processed' THEN
    UPDATE public.domain_events
    SET status = 'processed', processed_at = now(), last_error = NULL
    WHERE id = _event_id;
  ELSIF _new_status = 'failed' THEN
    SELECT attempts INTO _current_attempts FROM public.domain_events WHERE id = _event_id;
    UPDATE public.domain_events
    SET 
      status = 'failed',
      last_error = _error,
      next_retry_at = now() + (power(2, COALESCE(_current_attempts, 1)) * interval '1 minute')
    WHERE id = _event_id;
  ELSE
    RAISE EXCEPTION 'Invalid status: %. Must be processed or failed', _new_status;
  END IF;
END;
$$;

-- Lock down execution to authenticated users (RPC will be called by edge function via service_role)
REVOKE EXECUTE ON FUNCTION public.claim_pending_events(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_event_processed(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_old_audit_records() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_events(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_event_processed(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_old_audit_records() TO service_role;