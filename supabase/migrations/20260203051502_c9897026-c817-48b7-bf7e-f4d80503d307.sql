-- Fix Security Definer Views by using SECURITY INVOKER
-- This ensures views use the permissions of the querying user

-- Drop and recreate security_dashboard with SECURITY INVOKER
DROP VIEW IF EXISTS public.security_dashboard;
CREATE VIEW public.security_dashboard 
WITH (security_invoker = on)
AS
SELECT 
    DATE_TRUNC('hour', created_at) as time_bucket,
    action,
    entity_type,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

-- Drop and recreate suspicious_activities with SECURITY INVOKER
DROP VIEW IF EXISTS public.suspicious_activities;
CREATE VIEW public.suspicious_activities 
WITH (security_invoker = on)
AS
SELECT 
    user_id,
    entity_type,
    action,
    COUNT(*) as frequency,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1, 2, 3
HAVING COUNT(*) > 50
ORDER BY frequency DESC;