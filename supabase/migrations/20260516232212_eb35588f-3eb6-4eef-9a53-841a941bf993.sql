
CREATE TABLE IF NOT EXISTS public.dispatcher_event_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text NOT NULL,
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  aggregate_type text,
  aggregate_id uuid,
  tenant_id uuid,
  status text NOT NULL CHECK (status IN ('processed','failed','skipped')),
  error text,
  latency_ms integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (correlation_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_dispatcher_event_exec_corr
  ON public.dispatcher_event_executions (correlation_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatcher_event_exec_executed
  ON public.dispatcher_event_executions (executed_at DESC);

ALTER TABLE public.dispatcher_event_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read dispatcher event executions" ON public.dispatcher_event_executions;
CREATE POLICY "Admins read dispatcher event executions" ON public.dispatcher_event_executions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.record_dispatcher_event_execution(
  _correlation_id text,
  _event_id uuid,
  _event_type text,
  _aggregate_type text,
  _aggregate_id uuid,
  _tenant_id uuid,
  _status text,
  _error text,
  _latency_ms integer,
  _attempts integer
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.dispatcher_event_executions (
    correlation_id, event_id, event_type, aggregate_type, aggregate_id,
    tenant_id, status, error, latency_ms, attempts
  ) VALUES (
    _correlation_id, _event_id, _event_type, _aggregate_type, _aggregate_id,
    _tenant_id, _status, _error, _latency_ms, _attempts
  )
  ON CONFLICT (correlation_id, event_id) DO UPDATE SET
    status = EXCLUDED.status,
    error = EXCLUDED.error,
    latency_ms = EXCLUDED.latency_ms,
    attempts = EXCLUDED.attempts,
    executed_at = now();
$$;

REVOKE EXECUTE ON FUNCTION public.record_dispatcher_event_execution(text, uuid, text, text, uuid, uuid, text, text, integer, integer) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_dispatcher_event_execution(text, uuid, text, text, uuid, uuid, text, text, integer, integer) TO service_role;
