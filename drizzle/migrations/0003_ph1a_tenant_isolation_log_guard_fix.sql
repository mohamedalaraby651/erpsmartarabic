-- PH1A-NAZRA-001 · BND-05 — Delta D-2
-- The guard trigger referenced NEW.entity_type, a column that exists on
-- activity_logs but not on audit_trail, which broke audit_trail inserts.
-- Field access is now row-type agnostic.
CREATE OR REPLACE FUNCTION public.ph1a_fill_log_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j jsonb := to_jsonb(NEW);
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_current_tenant();
  END IF;

  IF NEW.tenant_id IS NULL AND (j->>'entity_type') = 'tenants' THEN
    BEGIN
      NEW.tenant_id := (j->>'entity_id')::uuid;
    EXCEPTION WHEN others THEN
      NEW.tenant_id := NULL;
    END;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RETURN NULL;  -- platform-plane event: skip logging, never block the write
  END IF;

  RETURN NEW;
END;
$$;
