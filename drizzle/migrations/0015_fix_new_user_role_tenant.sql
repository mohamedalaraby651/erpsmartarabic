CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'sales', 'a0000000-0000-0000-0000-000000000001'::uuid);
    RETURN NEW;
END;
$function$;