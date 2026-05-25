
CREATE TABLE IF NOT EXISTS public.pdf_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  file_url TEXT,
  error_message TEXT,
  requested_by UUID NOT NULL,
  delivered_to_email TEXT,
  payload JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdf_export_jobs_tenant ON public.pdf_export_jobs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_export_jobs_status ON public.pdf_export_jobs(status) WHERE status IN ('queued','running');

ALTER TABLE public.pdf_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view their export jobs"
ON public.pdf_export_jobs FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "tenant members can create export jobs"
ON public.pdf_export_jobs FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND requested_by = auth.uid()
);

CREATE POLICY "tenant members can update their own jobs"
ON public.pdf_export_jobs FOR UPDATE
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "admins can delete export jobs"
ON public.pdf_export_jobs FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE TRIGGER trg_pdf_export_jobs_updated_at
BEFORE UPDATE ON public.pdf_export_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
