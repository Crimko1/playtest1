CREATE OR REPLACE FUNCTION public.validate_room_container()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.items) item WHERE item <> 'null'::jsonb AND coalesce(item->>'id','') NOT IN ('axe','pistol','health','adrenaline','navigator','flashcharge','papermap','pipe','knife','radar','tear')) THEN RAISE EXCEPTION 'Storage accepts tools only'; END IF;
 RETURN NEW;
END $function$;