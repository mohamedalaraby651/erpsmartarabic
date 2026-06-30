-- UX-2B Wave 2B — invoice_events (Finance event store)
-- ADR-0012 §D-0012-08: sequence is the SOLE ordering authority.
-- ADR-0012 §D-0012-09: metadata is operational only — never a domain input.
-- Idempotent. Scope-limited (does not touch domain_events). No data mutation.

-- 1) TABLE
CREATE TABLE IF NOT EXISTS public.invoice_events (
  event_id       uuid        NOT NULL,
  aggregate_id   uuid        NOT NULL,
  tenant_id      uuid        NOT NULL,
  sequence       integer     NOT NULL,
  type           text        NOT NULL,
  schema_version integer     NOT NULL,
  payload        jsonb       NOT NULL,
  metadata       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_events_pk PRIMARY KEY (event_id),
  CONSTRAINT invoice_events_seq_positive CHECK (sequence >= 1),
  CONSTRAINT invoice_events_schema_version_positive CHECK (schema_version >= 1)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_events_aggregate_sequence_unique'
  ) THEN
    ALTER TABLE public.invoice_events
      ADD CONSTRAINT invoice_events_aggregate_sequence_unique
      UNIQUE (aggregate_id, sequence);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS invoice_events_aggregate_sequence_idx
  ON public.invoice_events (aggregate_id, sequence);

CREATE INDEX IF NOT EXISTS invoice_events_tenant_idx
  ON public.invoice_events (tenant_id);

-- 2) GRANTS (no anon — events are auth-only)
GRANT SELECT, INSERT ON public.invoice_events TO authenticated;
GRANT ALL            ON public.invoice_events TO service_role;
-- Deliberately no UPDATE / DELETE for authenticated: events are immutable.

-- 3) current_tenant() helper (returns NULL for orphan users)
CREATE OR REPLACE FUNCTION public.current_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_tenants
  WHERE user_id = auth.uid()
  ORDER BY is_default DESC NULLS LAST, joined_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_tenant() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant() TO authenticated, service_role;

-- 4) RLS
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_events_select_same_tenant ON public.invoice_events;
CREATE POLICY invoice_events_select_same_tenant
  ON public.invoice_events
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant());

DROP POLICY IF EXISTS invoice_events_insert_same_tenant ON public.invoice_events;
CREATE POLICY invoice_events_insert_same_tenant
  ON public.invoice_events
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_tenant());

COMMENT ON TABLE public.invoice_events IS 'UX-2B Wave 2B append-only event store for Invoice aggregate. Ordering authority is (aggregate_id, sequence). occurred_at/created_at are observational only (ADR-0012 D-0012-08). metadata is operational only, never read by domain code (ADR-0012 D-0012-09).';
