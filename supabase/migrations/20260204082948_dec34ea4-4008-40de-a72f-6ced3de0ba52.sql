-- =============================================
-- PHASE 3: FINANCIAL GOVERNANCE - Create missing tables
-- =============================================

-- 1. Create approval chains table
CREATE TABLE IF NOT EXISTS public.approval_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    entity_type TEXT NOT NULL,
    amount_threshold DECIMAL NOT NULL DEFAULT 0,
    required_approvers INTEGER NOT NULL DEFAULT 1,
    approver_roles TEXT[] NOT NULL,
    escalation_hours INTEGER DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create approval records table
CREATE TABLE IF NOT EXISTS public.approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    chain_id UUID REFERENCES public.approval_chains(id),
    current_level INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by UUID[] DEFAULT '{}',
    rejection_reason TEXT,
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create SoD rules table
CREATE TABLE IF NOT EXISTS public.sod_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    conflicting_actions JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_approval_chains_tenant ON public.approval_chains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_chains_entity ON public.approval_chains(entity_type, tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_tenant ON public.approval_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_entity ON public.approval_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_status ON public.approval_records(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sod_rules_tenant ON public.sod_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sod_rules_active ON public.sod_rules(is_active) WHERE is_active = true;

-- 5. Enable RLS
ALTER TABLE public.approval_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sod_rules ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for approval_chains
DROP POLICY IF EXISTS "Tenant users can view approval chains" ON public.approval_chains;
CREATE POLICY "Tenant users can view approval chains"
    ON public.approval_chains FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant() OR tenant_id IS NULL);

DROP POLICY IF EXISTS "Tenant admins can manage approval chains" ON public.approval_chains;
CREATE POLICY "Tenant admins can manage approval chains"
    ON public.approval_chains FOR ALL TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- 7. RLS Policies for approval_records
DROP POLICY IF EXISTS "Tenant users can view approval records" ON public.approval_records;
CREATE POLICY "Tenant users can view approval records"
    ON public.approval_records FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS "Tenant users can create approval records" ON public.approval_records;
CREATE POLICY "Tenant users can create approval records"
    ON public.approval_records FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS "Approvers can update approval records" ON public.approval_records;
CREATE POLICY "Approvers can update approval records"
    ON public.approval_records FOR UPDATE TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND (
            public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'accountant')
        )
    );

-- 8. RLS Policies for sod_rules
DROP POLICY IF EXISTS "Tenant admins can view SoD rules" ON public.sod_rules;
CREATE POLICY "Tenant admins can view SoD rules"
    ON public.sod_rules FOR SELECT TO authenticated
    USING (
        (tenant_id = public.get_current_tenant() OR tenant_id IS NULL)
        AND public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Tenant admins can manage SoD rules" ON public.sod_rules;
CREATE POLICY "Tenant admins can manage SoD rules"
    ON public.sod_rules FOR ALL TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- 9. Triggers for updated_at
DROP TRIGGER IF EXISTS update_approval_chains_updated_at ON public.approval_chains;
CREATE TRIGGER update_approval_chains_updated_at
    BEFORE UPDATE ON public.approval_chains
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_records_updated_at ON public.approval_records;
CREATE TRIGGER update_approval_records_updated_at
    BEFORE UPDATE ON public.approval_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sod_rules_updated_at ON public.sod_rules;
CREATE TRIGGER update_sod_rules_updated_at
    BEFORE UPDATE ON public.sod_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Audit triggers
DROP TRIGGER IF EXISTS audit_approval_chains_changes ON public.approval_chains;
CREATE TRIGGER audit_approval_chains_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.approval_chains
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS audit_approval_records_changes ON public.approval_records;
CREATE TRIGGER audit_approval_records_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.approval_records
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS audit_sod_rules_changes ON public.sod_rules;
CREATE TRIGGER audit_sod_rules_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.sod_rules
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- 11. Create helper functions
CREATE OR REPLACE FUNCTION public.get_approval_chain(
    _entity_type TEXT,
    _amount DECIMAL
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM approval_chains
    WHERE entity_type = _entity_type
    AND (tenant_id = get_current_tenant() OR tenant_id IS NULL)
    AND is_active = true
    AND amount_threshold <= _amount
    ORDER BY amount_threshold DESC
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.needs_approval(
    _entity_type TEXT,
    _amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM approval_chains
        WHERE entity_type = _entity_type
        AND (tenant_id = get_current_tenant() OR tenant_id IS NULL)
        AND is_active = true
        AND amount_threshold <= _amount
    )
$$;

CREATE OR REPLACE FUNCTION public.check_sod_violation(
    _user_id UUID,
    _section TEXT,
    _action TEXT,
    _entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _violation RECORD;
    _tenant_id UUID;
BEGIN
    _tenant_id := get_current_tenant();
    
    FOR _violation IN
        SELECT sr.* FROM sod_rules sr
        WHERE sr.is_active = true
        AND (sr.tenant_id = _tenant_id OR sr.tenant_id IS NULL)
        AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(sr.conflicting_actions) ca
            WHERE ca->>'section' = _section AND ca->>'action' = _action
        )
    LOOP
        IF EXISTS (
            SELECT 1 FROM activity_logs al
            CROSS JOIN jsonb_array_elements(_violation.conflicting_actions) ca
            WHERE al.user_id = _user_id
            AND al.entity_id = _entity_id::TEXT
            AND al.entity_type = ca->>'section'
            AND al.action = ca->>'action'
            AND NOT (ca->>'section' = _section AND ca->>'action' = _action)
        ) THEN
            RETURN jsonb_build_object(
                'violated', true,
                'rule_id', _violation.id,
                'rule_name', _violation.name,
                'message', 'لا يمكنك تنفيذ هذا الإجراء بسبب قواعد فصل المهام: ' || _violation.name
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object('violated', false);
END;
$$;