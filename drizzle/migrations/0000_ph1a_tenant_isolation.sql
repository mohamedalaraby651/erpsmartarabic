-- =====================================================================
-- PH1A-NAZRA-001 · BND-05 — Tenant → Data
-- Scope: tenant column completeness + RLS tenant enforcement on all
--        tenant-scoped public tables. Nothing else.
-- Authority: PostgreSQL RLS. Tenant identity = public.get_current_tenant()
--            (server-side, JWT-derived). Client input has zero authority.
--
-- Design note (ADR-0045): tenant enforcement is added as RESTRICTIVE
-- policies (one per verb) so existing permissive authorization policies
-- (roles / section permissions) are NOT modified. Permission / PDP
-- semantics belong to Phase 1B and are out of scope here. RESTRICTIVE
-- policies are AND-ed with permissive ones, so tenant isolation cannot be
-- weakened by any existing or future permissive rule.
-- =====================================================================

-- Part 0 — Backfill (only two tables carry NULL tenant_id rows)
UPDATE public.notifications n
   SET tenant_id = ut.tenant_id
  FROM public.user_tenants ut
 WHERE n.tenant_id IS NULL AND ut.user_id = n.user_id AND ut.is_default;

UPDATE public.notifications
   SET tenant_id = (SELECT id FROM public.tenants LIMIT 1)
 WHERE tenant_id IS NULL AND (SELECT count(*) FROM public.tenants) = 1;

UPDATE public.rate_limits r
   SET tenant_id = ut.tenant_id
  FROM public.user_tenants ut
 WHERE r.tenant_id IS NULL AND ut.user_id = r.user_id AND ut.is_default;

-- rate_limits rows are ephemeral counters; unattributable rows are dropped.
DELETE FROM public.rate_limits WHERE tenant_id IS NULL;

-- Part 1 — Column completeness: DEFAULT, NOT NULL, FK, index, RLS
DO $do$
DECLARE
  r record;
  excluded_tables text[] := ARRAY['user_tenants'];
  nulls bigint;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname, a.attnum, a.attnotnull
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public' AND c.relkind = 'r'
       AND a.attname = 'tenant_id' AND NOT a.attisdropped
       AND NOT (c.relname = ANY (excluded_tables))
     ORDER BY c.relname
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant()',
      r.relname);

    IF NOT r.attnotnull THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', r.relname)
        INTO nulls;
      IF nulls = 0 THEN
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', r.relname);
      ELSE
        RAISE EXCEPTION 'PH1A: % has % NULL tenant_id rows; NOT NULL cannot be enforced',
          r.relname, nulls;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint k
       WHERE k.conrelid = r.oid AND k.contype = 'f' AND k.conkey = ARRAY[r.attnum]
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) '
        || 'REFERENCES public.tenants(id) ON DELETE RESTRICT',
        r.relname, r.relname || '_tenant_id_fkey');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_index i
       WHERE i.indrelid = r.oid AND r.attnum = ANY (i.indkey)
    ) THEN
      EXECUTE format('CREATE INDEX %I ON public.%I (tenant_id)',
        'idx_' || r.relname || '_tenant_id', r.relname);
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END
$do$;

-- Part 2 — Four RESTRICTIVE tenant policies per tenant-scoped table
DO $do$
DECLARE
  r record;
  excluded_tables text[] := ARRAY['user_tenants'];
  pname text;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public' AND c.relkind = 'r'
       AND a.attname = 'tenant_id' AND NOT a.attisdropped
       AND NOT (c.relname = ANY (excluded_tables))
     ORDER BY c.relname
  LOOP
    pname := r.relname || '_tenant_restrict_select';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pname, r.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated, anon '
      || 'USING (tenant_id = public.get_current_tenant())', pname, r.relname);

    pname := r.relname || '_tenant_restrict_insert';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pname, r.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated, anon '
      || 'WITH CHECK (tenant_id = public.get_current_tenant())', pname, r.relname);

    pname := r.relname || '_tenant_restrict_update';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pname, r.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated, anon '
      || 'USING (tenant_id = public.get_current_tenant()) '
      || 'WITH CHECK (tenant_id = public.get_current_tenant())', pname, r.relname);

    pname := r.relname || '_tenant_restrict_delete';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pname, r.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated, anon '
      || 'USING (tenant_id = public.get_current_tenant())', pname, r.relname);
  END LOOP;
END
$do$;

-- Part 3 — GRANT consistency for tenant-scoped tables
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public' AND c.relkind = 'r'
       AND a.attname = 'tenant_id' AND NOT a.attisdropped
     ORDER BY c.relname
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.relname);
  END LOOP;
END
$do$;
