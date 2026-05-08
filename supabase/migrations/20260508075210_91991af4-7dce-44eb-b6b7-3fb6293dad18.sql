
-- Pin the search_path on the only remaining function flagged by the linter.
ALTER FUNCTION public.guard_credit_note_items_immutable() SET search_path = public;
