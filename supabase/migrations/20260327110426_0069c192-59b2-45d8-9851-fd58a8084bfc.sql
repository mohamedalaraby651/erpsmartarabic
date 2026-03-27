CREATE OR REPLACE FUNCTION public.find_duplicate_customers(p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE(
  id1 uuid, name1 text, phone1 text,
  id2 uuid, name2 text, phone2 text,
  similarity_score float, match_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT 
      a.id AS id1, a.name AS name1, a.phone AS phone1,
      b.id AS id2, b.name AS name2, b.phone AS phone2,
      extensions.similarity(a.name, b.name)::float AS sim,
      'name'::text AS mtype
    FROM customers a
    JOIN customers b ON a.id < b.id
    WHERE (p_tenant_id IS NULL OR (a.tenant_id = p_tenant_id AND b.tenant_id = p_tenant_id))
      AND extensions.similarity(a.name, b.name) > 0.5
    
    UNION ALL
    
    SELECT 
      a.id, a.name, a.phone,
      b.id, b.name, b.phone,
      1.0::float,
      'phone'::text
    FROM customers a
    JOIN customers b ON a.id < b.id
    WHERE (p_tenant_id IS NULL OR (a.tenant_id = p_tenant_id AND b.tenant_id = p_tenant_id))
      AND a.phone IS NOT NULL AND a.phone != ''
      AND a.phone = b.phone
      AND extensions.similarity(a.name, b.name) <= 0.5
  ) sub
  ORDER BY sub.sim DESC
  LIMIT 50;
END;
$$;