CREATE TABLE public.approval_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL DEFAULT public.get_current_tenant(),
 request_type text NOT NULL DEFAULT 'reopen_period' CHECK (request_type = 'reopen_period'),
 entity_id uuid NOT NULL,
 reason text NOT NULL,
 requested_by uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 resolved_by uuid,
 resolution_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 consumed_at timestamptz
);
GRANT SELECT ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY approval_requests_read ON public.approval_requests FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant() AND (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE UNIQUE INDEX approval_requests_pending_period ON public.approval_requests(tenant_id,entity_id) WHERE status = 'pending';
CREATE FUNCTION public.request_period_reopen(_period_id uuid, _reason text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant uuid := public.get_current_tenant(); _id uuid;
BEGIN
 IF auth.uid() IS NULL OR _tenant IS NULL OR NOT public.check_section_permission(auth.uid(),'accounting','edit') THEN RAISE EXCEPTION 'غير مصرح بطلب فتح الفترة' USING ERRCODE='42501'; END IF;
 IF NULLIF(btrim(_reason),'') IS NULL THEN RAISE EXCEPTION 'سبب طلب فتح الفترة مطلوب'; END IF;
 PERFORM 1 FROM public.fiscal_periods WHERE id=_period_id AND tenant_id=_tenant AND is_closed FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الفترة ليست مقفلة أو غير متاحة'; END IF;
 SELECT id INTO _id FROM public.approval_requests WHERE tenant_id=_tenant AND entity_id=_period_id AND status='pending';
 IF _id IS NOT NULL THEN RETURN _id; END IF;
 INSERT INTO public.approval_requests(tenant_id,entity_id,reason,requested_by) VALUES(_tenant,_period_id,btrim(_reason),auth.uid()) RETURNING id INTO _id;
 RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.request_period_reopen(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_period_reopen(uuid,text) TO authenticated;
CREATE FUNCTION public.guard_period_reopening() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _request uuid;
BEGIN
 IF OLD.is_closed AND NOT NEW.is_closed THEN
  IF auth.uid() IS NULL OR NEW.tenant_id IS DISTINCT FROM public.get_current_tenant() OR NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'فتح الفترة يتطلب موافقة المدير' USING ERRCODE='42501'; END IF;
  SELECT id INTO _request FROM public.approval_requests WHERE tenant_id=OLD.tenant_id AND entity_id=OLD.id AND status='approved' AND resolved_by=auth.uid() AND consumed_at IS NULL AND resolved_at >= transaction_timestamp() FOR UPDATE;
  IF _request IS NULL THEN RAISE EXCEPTION 'يجب اعتماد طلب موثق قبل فتح الفترة' USING ERRCODE='42501'; END IF;
  UPDATE public.approval_requests SET consumed_at=now() WHERE id=_request;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_period_reopening BEFORE UPDATE OF is_closed ON public.fiscal_periods FOR EACH ROW EXECUTE FUNCTION public.guard_period_reopening();
CREATE FUNCTION public.resolve_period_reopen(_request_id uuid,_approve boolean,_reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _request public.approval_requests%ROWTYPE; _tenant uuid:=public.get_current_tenant();
BEGIN
 IF auth.uid() IS NULL OR _tenant IS NULL OR NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'الموافقة للمدير فقط' USING ERRCODE='42501'; END IF;
 IF _approve IS NULL THEN RAISE EXCEPTION 'قرار الموافقة مطلوب'; END IF;
 SELECT * INTO _request FROM public.approval_requests WHERE id=_request_id AND tenant_id=_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير متاح' USING ERRCODE='42501'; END IF;
 IF _request.status <> 'pending' THEN RAISE EXCEPTION 'تم البت في الطلب بالفعل'; END IF;
 IF NOT _approve AND NULLIF(btrim(_reason),'') IS NULL THEN RAISE EXCEPTION 'سبب الرفض مطلوب'; END IF;
 UPDATE public.approval_requests SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,resolved_by=auth.uid(),resolved_at=now(),resolution_reason=NULLIF(btrim(_reason),'') WHERE id=_request_id;
 IF _approve THEN
  UPDATE public.fiscal_periods SET is_closed=false,closed_at=NULL,closed_by=NULL WHERE id=_request.entity_id AND tenant_id=_tenant AND is_closed;
  IF NOT FOUND THEN RAISE EXCEPTION 'الفترة لم تعد مقفلة'; END IF;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_period_reopen(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_period_reopen(uuid,boolean,text) TO authenticated;