CREATE OR REPLACE FUNCTION public.validate_room_container()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.items) item WHERE item <> 'null'::jsonb AND coalesce(item->>'id','') NOT IN ('axe','pistol','health','adrenaline','navigator','flashcharge','papermap','pipe','knife','radar','tear')) THEN RAISE EXCEPTION 'Storage accepts tools only'; END IF;
 RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS validate_room_container ON public.room_containers;
CREATE TRIGGER validate_room_container BEFORE INSERT OR UPDATE ON public.room_containers FOR EACH ROW EXECUTE FUNCTION public.validate_room_container();