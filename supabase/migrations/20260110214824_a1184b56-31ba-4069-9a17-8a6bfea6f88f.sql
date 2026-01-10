-- Fix user_login_history INSERT policy
DROP POLICY IF EXISTS "System can insert login history" ON public.user_login_history;

CREATE POLICY "Users can insert own login history"
ON public.user_login_history
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can only insert their own login history
  user_id = auth.uid()
);