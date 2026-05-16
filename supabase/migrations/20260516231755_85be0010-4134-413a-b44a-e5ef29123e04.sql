
-- Track each event-dispatcher batch run keyed by correlation_id
CREATE TABLE IF NOT EXISTS public.dispatcher_batch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now(),
  processed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  batch_size integer NOT NULL DEFAULT 0,
  claimed_count integer NOT NULL DEFAULT 0,
  total_ms integer NOT NULL DEFAULT 0,
  auth_mode text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatcher_batch_runs_started
  ON public.dispatcher_batch_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatcher_batch_runs_corr
  ON public.dispatcher_batch_runs (correlation_id);

ALTER TABLE public.dispatcher_batch_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read dispatcher batch runs" ON public.dispatcher_batch_runs;
CREATE POLICY "Admins read dispatcher batch runs" ON public.dispatcher_batch_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Recorder: service role only
CREATE OR REPLACE FUNCTION public.record_dispatcher_batch(
  _correlation_id text,
  _processed integer,
  _failed integer,
  _skipped integer,
  _batch_size integer,
  _claimed_count integer,
  _total_ms integer,
  _auth_mode text,
  _started_at timestamptz
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.dispatcher_batch_runs (
    correlation_id, started_at, finished_at, processed, failed, skipped,
    batch_size, claimed_count, total_ms, auth_mode
  ) VALUES (
    _correlation_id, _started_at, now(), _processed, _failed, _skipped,
    _batch_size, _claimed_count, _total_ms, _auth_mode
  );
$$;

REVOKE EXECUTE ON FUNCTION public.record_dispatcher_batch(text, integer, integer, integer, integer, integer, integer, text, timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_dispatcher_batch(text, integer, integer, integer, integer, integer, integer, text, timestamptz) TO service_role;
