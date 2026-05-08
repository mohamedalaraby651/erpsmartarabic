CREATE TABLE IF NOT EXISTS public.operation_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  operation text NOT NULL,
  idempotency_key text NOT NULL,
  response_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS operation_idempotency_unique
  ON public.operation_idempotency (tenant_id, operation, idempotency_key);

CREATE INDEX IF NOT EXISTS operation_idempotency_expires_idx
  ON public.operation_idempotency (expires_at);

CREATE INDEX IF NOT EXISTS operation_idempotency_user_idx
  ON public.operation_idempotency (user_id);

ALTER TABLE public.operation_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "idempotency_select_own_tenant" ON public.operation_idempotency;
CREATE POLICY "idempotency_select_own_tenant"
  ON public.operation_idempotency
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_current_tenant()
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "idempotency_insert_own_tenant" ON public.operation_idempotency;
CREATE POLICY "idempotency_insert_own_tenant"
  ON public.operation_idempotency
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_tenant()
    AND user_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.prune_expired_idempotency()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.operation_idempotency WHERE expires_at < now();
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_expired_idempotency() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_expired_idempotency() TO service_role;