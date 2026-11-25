REVOKE EXECUTE ON FUNCTION public.atomic_customer_balance_update(uuid,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_customer_balance_update(uuid,numeric) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_journal_dimension_tenant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE journal_tenant uuid;
BEGIN
 SELECT tenant_id INTO journal_tenant FROM public.journals WHERE id = NEW.journal_id;
 IF journal_tenant IS NULL OR NEW.tenant_id IS DISTINCT FROM journal_tenant THEN
  RAISE EXCEPTION 'Invalid journal tenant' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE id=NEW.account_id AND tenant_id=journal_tenant)
 OR (NEW.cost_center_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tenant_cost_centers WHERE id=NEW.cost_center_id AND tenant_id=journal_tenant))
 OR (NEW.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tenant_projects WHERE id=NEW.project_id AND tenant_id=journal_tenant))
 OR (NEW.department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tenant_departments WHERE id=NEW.department_id AND tenant_id=journal_tenant)) THEN
  RAISE EXCEPTION 'Journal reference must belong to its tenant' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_journal_dimension_tenant() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zz_guard_journal_dimension_tenant BEFORE INSERT OR UPDATE OF journal_id, tenant_id, account_id, cost_center_id, project_id, department_id ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.guard_journal_dimension_tenant();