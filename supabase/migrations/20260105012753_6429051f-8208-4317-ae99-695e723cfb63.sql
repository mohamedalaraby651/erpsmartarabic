-- Fix Activity Logs INSERT Policy - Remove user ability to insert arbitrary logs
-- Activity logs should only be inserted by service role or database triggers

DROP POLICY IF EXISTS "Authenticated can insert activity logs" ON public.activity_logs;

-- Create a more restrictive policy - only service role can insert logs
-- This prevents users from injecting false audit records
CREATE POLICY "Service role can insert activity logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (
  -- Only allow service_role to insert (used by database triggers and backend functions)
  (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  OR
  -- Or allow authenticated users to log their own actions with matching user_id
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);