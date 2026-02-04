-- =============================================
-- PHASE 2: RATE LIMITING INFRASTRUCTURE
-- =============================================

-- 1. Create rate limit configuration table
CREATE TABLE public.rate_limit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'default',
    max_requests INTEGER NOT NULL DEFAULT 100,
    window_seconds INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(endpoint, tier)
);

-- 2. Create rate limits tracking table (Token Bucket)
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id),
    endpoint TEXT NOT NULL,
    tokens_remaining INTEGER NOT NULL,
    last_refill TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

-- 3. Create indexes
CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX idx_rate_limits_tenant ON public.rate_limits(tenant_id);
CREATE INDEX idx_rate_limit_config_endpoint ON public.rate_limit_config(endpoint);

-- 4. Enable RLS
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for rate_limit_config (admin only)
CREATE POLICY "Admins can view rate limit config"
    ON public.rate_limit_config FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage rate limit config"
    ON public.rate_limit_config FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 6. RLS Policies for rate_limits (system managed)
CREATE POLICY "System can manage rate limits"
    ON public.rate_limits FOR ALL TO authenticated
    USING (true);

-- 7. Create check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    _user_id UUID,
    _endpoint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _config RECORD;
    _current RECORD;
    _now TIMESTAMPTZ := now();
    _tokens_to_add INTEGER;
    _new_tokens INTEGER;
BEGIN
    -- Get configuration for this endpoint
    SELECT * INTO _config
    FROM rate_limit_config
    WHERE endpoint = _endpoint
    AND is_active = true
    ORDER BY tier = 'default' ASC -- Non-default tiers first
    LIMIT 1;
    
    -- If no config, allow request
    IF NOT FOUND THEN
        RETURN true;
    END IF;
    
    -- Get current rate limit state
    SELECT * INTO _current
    FROM rate_limits
    WHERE user_id = _user_id AND endpoint = _endpoint;
    
    -- If no existing record, create one and allow
    IF NOT FOUND THEN
        INSERT INTO rate_limits (user_id, tenant_id, endpoint, tokens_remaining, last_refill)
        VALUES (_user_id, public.get_current_tenant(), _endpoint, _config.max_requests - 1, _now);
        RETURN true;
    END IF;
    
    -- Calculate tokens to add based on time elapsed
    _tokens_to_add := FLOOR(
        EXTRACT(EPOCH FROM (_now - _current.last_refill)) / 
        _config.window_seconds * _config.max_requests
    );
    
    -- Calculate new token count
    _new_tokens := LEAST(_config.max_requests, _current.tokens_remaining + _tokens_to_add);
    
    -- If no tokens available, deny request
    IF _new_tokens <= 0 THEN
        RETURN false;
    END IF;
    
    -- Consume a token and update
    UPDATE rate_limits
    SET 
        tokens_remaining = _new_tokens - 1,
        last_refill = CASE 
            WHEN _tokens_to_add > 0 THEN _now 
            ELSE last_refill 
        END
    WHERE user_id = _user_id AND endpoint = _endpoint;
    
    RETURN true;
END;
$$;

-- 8. Insert default rate limit configurations for Edge Functions
INSERT INTO rate_limit_config (endpoint, tier, max_requests, window_seconds) VALUES
    ('validate-invoice', 'default', 60, 60),
    ('process-payment', 'default', 30, 60),
    ('approve-expense', 'default', 30, 60),
    ('approve-invoice', 'default', 30, 60),
    ('stock-movement', 'default', 60, 60),
    ('create-journal', 'default', 30, 60),
    ('verify-totp', 'default', 10, 60)
ON CONFLICT (endpoint, tier) DO NOTHING;

-- 9. Audit logging trigger
CREATE TRIGGER audit_rate_limit_config_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.rate_limit_config
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();