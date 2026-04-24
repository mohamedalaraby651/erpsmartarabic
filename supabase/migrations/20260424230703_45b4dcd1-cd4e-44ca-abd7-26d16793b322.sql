-- ============================================================
-- restore_snapshots table: tracks every pre-restore snapshot
-- ============================================================
CREATE TABLE public.restore_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  storage_path TEXT NOT NULL,
  tables TEXT[] NOT NULL DEFAULT '{}',
  row_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_rows INTEGER NOT NULL DEFAULT 0,
  planned_mode TEXT NOT NULL CHECK (planned_mode IN ('append','upsert','replace')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','rolled_back','expired','failed')),
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_restore_snapshots_tenant ON public.restore_snapshots(tenant_id, created_at DESC);
CREATE INDEX idx_restore_snapshots_status ON public.restore_snapshots(status) WHERE status = 'active';

ALTER TABLE public.restore_snapshots ENABLE ROW LEVEL SECURITY;

-- Only admins / tenant owners can view their tenant's snapshots
CREATE POLICY "Snapshots viewable by admin or tenant owner"
ON public.restore_snapshots
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = restore_snapshots.tenant_id
      AND ut.role = 'owner'
  )
);

-- Inserts/updates happen only via service-role from edge functions
CREATE POLICY "Snapshots no direct insert"
ON public.restore_snapshots
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Snapshots no direct update"
ON public.restore_snapshots
FOR UPDATE
TO authenticated
USING (false);

-- ============================================================
-- Storage bucket for snapshot JSON files (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('restore-snapshots', 'restore-snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: snapshot files live under <tenant_id>/<snapshot_id>.json
-- Only admins or tenant owners may read snapshot files of their tenant.
CREATE POLICY "Snapshot files readable by admin or tenant owner"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'restore-snapshots'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id::text = (storage.foldername(name))[1]
        AND ut.role = 'owner'
    )
  )
);

-- Writes/deletes are restricted to service-role only (no direct client access).
CREATE POLICY "Snapshot files no direct write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'restore-snapshots' AND false);

CREATE POLICY "Snapshot files no direct delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'restore-snapshots' AND false);