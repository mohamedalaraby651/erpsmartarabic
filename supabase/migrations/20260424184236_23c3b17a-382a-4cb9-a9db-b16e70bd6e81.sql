-- Make helper safe against invalid UUIDs (legacy paths)
CREATE OR REPLACE FUNCTION public.storage_tenant_from_path(_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage
AS $$
DECLARE _first text; _result uuid;
BEGIN
  _first := NULLIF((storage.foldername(_name))[1], '');
  IF _first IS NULL THEN RETURN NULL; END IF;
  BEGIN
    _result := _first::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  RETURN _result;
END;
$$;

-- Migrate legacy files
DO $$
DECLARE
  _default_tenant text := 'a0000000-0000-0000-0000-000000000001';
  _obj record;
  _new_name text;
BEGIN
  FOR _obj IN
    SELECT id, name, bucket_id FROM storage.objects
    WHERE bucket_id IN ('documents','customer-images','employee-images','supplier-images','avatars')
      AND public.storage_tenant_from_path(name) IS NULL
  LOOP
    _new_name := _default_tenant || '/' || _obj.name;
    UPDATE storage.objects SET name = _new_name WHERE id = _obj.id;

    -- Best-effort attachments URL update
    UPDATE public.attachments
    SET file_url = REPLACE(file_url, _obj.name, _new_name)
    WHERE _obj.bucket_id = 'documents'
      AND file_url LIKE '%' || _obj.name || '%';
  END LOOP;
END $$;