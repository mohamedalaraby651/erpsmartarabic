-- Observability table
CREATE TABLE IF NOT EXISTS public.event_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  hour_bucket timestamptz NOT NULL,
  success_count int NOT NULL DEFAULT 0,
  failure_count int NOT NULL DEFAULT 0,
  total_latency_ms numeric NOT NULL DEFAULT 0,
  UNIQUE(event_type, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_event_metrics_hour
  ON public.event_metrics(hour_bucket DESC);

ALTER TABLE public.event_metrics ENABLE ROW LEVEL SECURITY;

-- Admins-only read; no INSERT/UPDATE/DELETE policies (writes via SECURITY DEFINER RPC only)
DROP POLICY IF EXISTS "Admins read event metrics" ON public.event_metrics;
CREATE POLICY "Admins read event metrics" ON public.event_metrics
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Recording RPC (callable only by service_role, used by edge dispatcher)
CREATE OR REPLACE FUNCTION public.record_event_metric(
  _event_type text,
  _success boolean,
  _latency_ms numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.event_metrics (
    event_type, hour_bucket, success_count, failure_count, total_latency_ms
  )
  VALUES (
    _event_type,
    date_trunc('hour', now()),
    CASE WHEN _success THEN 1 ELSE 0 END,
    CASE WHEN _success THEN 0 ELSE 1 END,
    COALESCE(_latency_ms, 0)
  )
  ON CONFLICT (event_type, hour_bucket) DO UPDATE SET
    success_count = event_metrics.success_count + EXCLUDED.success_count,
    failure_count = event_metrics.failure_count + EXCLUDED.failure_count,
    total_latency_ms = event_metrics.total_latency_ms + EXCLUDED.total_latency_ms;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_event_metric(text, boolean, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_event_metric(text, boolean, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_event_metric(text, boolean, numeric) TO service_role;