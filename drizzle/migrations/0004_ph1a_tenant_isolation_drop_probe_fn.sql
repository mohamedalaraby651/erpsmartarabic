-- PH1A-NAZRA-001 · BND-05 — Delta D-3
-- The SECURITY DEFINER probe function cannot work: PostgreSQL forbids
-- setting the `role` parameter inside a security-definer function, so the
-- probe could never drop to `authenticated`. X-7 evidence is produced by the
-- audit script's admin-session DO-block instead. The privileged, unusable
-- surface is removed rather than left in place.
DROP FUNCTION IF EXISTS public.ph1a_cross_tenant_probe(text[]);
