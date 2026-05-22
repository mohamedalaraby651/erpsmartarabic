-- Wave 1 — Add correlation_id to activity_logs for end-to-end tracing
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS correlation_id uuid;

CREATE INDEX IF NOT EXISTS idx_activity_logs_correlation
  ON public.activity_logs(correlation_id)
  WHERE correlation_id IS NOT NULL;