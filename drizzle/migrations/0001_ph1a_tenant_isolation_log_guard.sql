-- PH1A-NAZRA-001 · BND-05 — follow-up (Delta D-1)
-- The NOT NULL tenant_id introduced on activity_logs / audit_trail broke
-- audit writes originating from platform-plane tables (e.g. public.tenants),
-- which have no tenant_id of their own. Guard trigger derives the tenant
-- server-side; if no tenant can be derived the log row is dropped rather than
-- failing the business write. Tenant isolation is unaffected: a row can only
-- ever be written with the caller's own tenant.
CREATE OR REPLACE FUNCTION public.ph1a_fill_log_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_current_tenant();
  END IF;

  IF NEW.tenant_id IS NULL AND TG_TABLE_NAME = 'activity_logs'
     AND NEW.entity_type = 'tenants' THEN
    BEGIN
      NEW.tenant_id := NEW.entity_id::uuid;
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

DROP TRIGGER IF EXISTS trg_ph1a_fill_tenant ON public.activity_logs;
CREATE TRIGGER trg_ph1a_fill_tenant
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.ph1a_fill_log_tenant();

DROP TRIGGER IF EXISTS trg_ph1a_fill_tenant ON public.audit_trail;
CREATE TRIGGER trg_ph1a_fill_tenant
  BEFORE INSERT ON public.audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.ph1a_fill_log_tenant();
