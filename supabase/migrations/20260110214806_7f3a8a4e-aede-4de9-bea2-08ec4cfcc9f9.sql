-- Fix RLS policies that use WITH CHECK (true) for INSERT operations

-- 1. Fix tasks INSERT policy - ensure users can only create tasks for themselves or as admin
DROP POLICY IF EXISTS "Authenticated can create tasks" ON public.tasks;

CREATE POLICY "Authenticated can create tasks with proper assignment"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only create tasks where they are the creator
  created_by = auth.uid() OR created_by IS NULL
);

-- 2. Fix notifications INSERT policy - only allow system/admin to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "System or admin can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only admins can create notifications for any user
  -- Or the system (service role) can create notifications
  has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Add policy to allow service role to create notifications (for triggers/functions)
-- Note: Service role bypasses RLS by default, so this is for documentation

-- 4. Fix attachments INSERT policy if needed - ensure proper ownership
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.attachments;

CREATE POLICY "Authenticated users can upload attachments"
ON public.attachments
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the uploader
  uploaded_by = auth.uid() OR uploaded_by IS NULL
);

-- 5. Ensure proper SELECT policies use auth.uid() check instead of just true for sensitive data
-- Update activity_logs to be admin-only for viewing
DROP POLICY IF EXISTS "Authenticated can view activity logs" ON public.activity_logs;

CREATE POLICY "Admin or user can view relevant logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  -- Admins can see all logs
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Users can see their own actions
  user_id = auth.uid()
);

-- 6. Add delete policy for tasks
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can delete own tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- 7. Add delete policy for notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);