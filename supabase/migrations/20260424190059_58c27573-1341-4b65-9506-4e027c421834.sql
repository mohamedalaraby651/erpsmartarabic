DROP VIEW IF EXISTS public.event_dispatcher_metrics;
DROP VIEW IF EXISTS public.event_dispatcher_backlog;

CREATE VIEW public.event_dispatcher_metrics
WITH (security_invoker = true) AS
SELECT
  date_trunc('hour', em.hour_bucket) AS hour,
  em.event_type,
  em.success_count,
  em.failure_count,
  em.success_count + em.failure_count AS total_count,
  CASE
    WHEN em.success_count + em.failure_count = 0 THEN 0
    ELSE ROUND((em.success_count::numeric / (em.success_count + em.failure_count)) * 100, 2)
  END AS success_rate_pct,
  CASE
    WHEN em.success_count + em.failure_count = 0 THEN 0
    ELSE ROUND(em.total_latency_ms / (em.success_count + em.failure_count), 2)
  END AS avg_latency_ms
FROM public.event_metrics em;

CREATE VIEW public.event_dispatcher_backlog
WITH (security_invoker = true) AS
SELECT
  status,
  event_type,
  count(*) AS event_count,
  min(created_at) AS oldest_event_at,
  max(attempts) AS max_attempts
FROM public.domain_events
WHERE status IN ('pending', 'failed', 'processing')
GROUP BY status, event_type;

GRANT SELECT ON public.event_dispatcher_metrics TO authenticated;
GRANT SELECT ON public.event_dispatcher_backlog TO authenticated;