CREATE TABLE public.room_containers (id text PRIMARY KEY, owner_id uuid NOT NULL, items jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_containers TO authenticated;
GRANT ALL ON public.room_containers TO service_role;
ALTER TABLE public.room_containers ENABLE ROW LEVEL SECURITY;
CREATE POLICY containers_owner ON public.room_containers FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid() AND jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 10);
CREATE TABLE public.hourly_scrap_claims (hour bigint NOT NULL, ordinal integer NOT NULL, player_id uuid NOT NULL, claimed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(hour, ordinal));
GRANT SELECT ON public.hourly_scrap_claims TO authenticated;
GRANT ALL ON public.hourly_scrap_claims TO service_role;
ALTER TABLE public.hourly_scrap_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY scrap_claims_read ON public.hourly_scrap_claims FOR SELECT TO authenticated USING (true);
CREATE OR REPLACE FUNCTION public.claim_hourly_scrap(requested_hour bigint, requested_ordinal integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h bigint := floor(extract(epoch from now()) / 3600); inserted_count integer;
BEGIN
 IF auth.uid() IS NULL OR requested_hour <> h OR requested_ordinal < 0 OR requested_ordinal >= 180 + mod(h * 17, 71) THEN RETURN false; END IF;
 INSERT INTO public.hourly_scrap_claims(hour, ordinal, player_id) VALUES (h, requested_ordinal, auth.uid()) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted_count = ROW_COUNT;
 RETURN inserted_count = 1;
END $$;
REVOKE ALL ON FUNCTION public.claim_hourly_scrap(bigint, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_hourly_scrap(bigint, integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.validate_room_container() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.items) item WHERE item <> 'null'::jsonb AND coalesce(item->>'id','') NOT IN ('axe','pistol','health','adrenaline','navigator','flashcharge','papermap','pipe')) THEN RAISE EXCEPTION 'Storage accepts tools only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_room_container BEFORE INSERT OR UPDATE ON public.room_containers FOR EACH ROW EXECUTE FUNCTION public.validate_room_container();