-- Fix rate_limits RLS policy to be more restrictive
-- The table is managed by check_rate_limit() SECURITY DEFINER function
-- Users should only see their own rate limit records

DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Users can view their own rate limits
CREATE POLICY "Users can view own rate limits"
    ON public.rate_limits FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Insert/Update/Delete handled by SECURITY DEFINER function check_rate_limit()
-- We allow INSERT for the function to work, but scope it to the user
CREATE POLICY "System can insert rate limits"
    ON public.rate_limits FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update rate limits"
    ON public.rate_limits FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Admins can delete rate limits for cleanup
CREATE POLICY "Admins can delete rate limits"
    ON public.rate_limits FOR DELETE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));