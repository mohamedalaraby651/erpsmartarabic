CREATE OR REPLACE FUNCTION public.protect_journal_reversals_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RAISE EXCEPTION 'journal_reversals جدول append-only — لا يمكن التعديل أو الحذف.' USING ERRCODE = 'P0001';
END;
$function$;