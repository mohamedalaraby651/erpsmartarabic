CREATE OR REPLACE FUNCTION public.track_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _before jsonb;
  _after jsonb;
  _changed text[] := '{}';
  _record_id uuid;
  _tenant uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _before := to_jsonb(OLD);
    _after := NULL;
    BEGIN
      _record_id := (to_jsonb(OLD)->>'id')::uuid;
    EXCEPTION WHEN others THEN
      _record_id := NULL;
    END;
    _tenant := COALESCE(NULLIF(to_jsonb(OLD)->>'tenant_id','')::uuid, get_current_tenant());
  ELSIF TG_OP = 'INSERT' THEN
    _before := NULL;
    _after := to_jsonb(NEW);
    BEGIN
      _record_id := (to_jsonb(NEW)->>'id')::uuid;
    EXCEPTION WHEN others THEN
      _record_id := NULL;
    END;
    _tenant := COALESCE(NULLIF(to_jsonb(NEW)->>'tenant_id','')::uuid, get_current_tenant());
  ELSE
    -- Early-exit: identical rows
    IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN
      RETURN NEW;
    END IF;

    _before := to_jsonb(OLD);
    _after := to_jsonb(NEW);
    BEGIN
      _record_id := (to_jsonb(NEW)->>'id')::uuid;
    EXCEPTION WHEN others THEN
      _record_id := NULL;
    END;
    _tenant := COALESCE(NULLIF(to_jsonb(NEW)->>'tenant_id','')::uuid, get_current_tenant());

    -- Diff via jsonb_each, excluding noisy housekeeping columns
    SELECT array_agg(e.key) INTO _changed
    FROM jsonb_each(_after) e
    WHERE _before -> e.key IS DISTINCT FROM e.value
      AND e.key NOT IN ('updated_at', 'last_activity_at', 'last_communication_at');

    -- Skip if only noisy columns changed
    IF _changed IS NULL OR array_length(_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_trail (
    tenant_id, user_id, table_name, record_id, operation,
    before_value, after_value, changed_fields
  ) VALUES (
    _tenant, auth.uid(), TG_TABLE_NAME, _record_id, TG_OP,
    _before, _after, _changed
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;