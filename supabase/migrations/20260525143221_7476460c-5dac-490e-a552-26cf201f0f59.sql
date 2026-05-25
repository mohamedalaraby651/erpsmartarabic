
-- Trigger function: keep tenant_pdf_assets.ref_count in sync with
-- the logo/watermark image references stored inside tenant_pdf_profiles.
CREATE OR REPLACE FUNCTION public.fn_sync_pdf_asset_ref_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_logo uuid;
  new_logo uuid;
  old_wm   uuid;
  new_wm   uuid;
  to_inc   uuid[] := ARRAY[]::uuid[];
  to_dec   uuid[] := ARRAY[]::uuid[];
  aid      uuid;
BEGIN
  -- Extract old IDs (UPDATE / DELETE)
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    BEGIN
      old_logo := NULLIF(OLD.branding ->> 'logoAssetId', '')::uuid;
    EXCEPTION WHEN others THEN old_logo := NULL; END;
    BEGIN
      old_wm := NULLIF(OLD.watermark ->> 'imageAssetId', '')::uuid;
    EXCEPTION WHEN others THEN old_wm := NULL; END;
  END IF;

  -- Extract new IDs (INSERT / UPDATE)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    BEGIN
      new_logo := NULLIF(NEW.branding ->> 'logoAssetId', '')::uuid;
    EXCEPTION WHEN others THEN new_logo := NULL; END;
    BEGIN
      new_wm := NULLIF(NEW.watermark ->> 'imageAssetId', '')::uuid;
    EXCEPTION WHEN others THEN new_wm := NULL; END;
  END IF;

  -- Compute deltas: increment for additions, decrement for removals/replacements.
  IF new_logo IS DISTINCT FROM old_logo THEN
    IF new_logo IS NOT NULL THEN to_inc := array_append(to_inc, new_logo); END IF;
    IF old_logo IS NOT NULL THEN to_dec := array_append(to_dec, old_logo); END IF;
  END IF;
  IF new_wm IS DISTINCT FROM old_wm THEN
    IF new_wm IS NOT NULL THEN to_inc := array_append(to_inc, new_wm); END IF;
    IF old_wm IS NOT NULL THEN to_dec := array_append(to_dec, old_wm); END IF;
  END IF;

  -- Apply increments
  FOREACH aid IN ARRAY to_inc LOOP
    UPDATE public.tenant_pdf_assets
      SET ref_count = ref_count + 1,
          deleted_at = NULL
      WHERE id = aid;
  END LOOP;

  -- Apply decrements, clamp at zero, soft-delete when reaching zero.
  FOREACH aid IN ARRAY to_dec LOOP
    UPDATE public.tenant_pdf_assets
      SET ref_count = GREATEST(0, ref_count - 1)
      WHERE id = aid;
    UPDATE public.tenant_pdf_assets
      SET deleted_at = COALESCE(deleted_at, now())
      WHERE id = aid AND ref_count = 0;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pdf_asset_ref_count ON public.tenant_pdf_profiles;
CREATE TRIGGER trg_sync_pdf_asset_ref_count
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_pdf_profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_pdf_asset_ref_count();
