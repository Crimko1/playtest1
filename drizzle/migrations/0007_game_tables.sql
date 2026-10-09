CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  avatar_url text,
  level int NOT NULL DEFAULT 1,
  total_quota bigint NOT NULL DEFAULT 0,
  trophies int NOT NULL DEFAULT 0,
  room jsonb NOT NULL DEFAULT '[]'::jsonb,
  save jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read all players" ON public.players;
DROP POLICY IF EXISTS "insert own" ON public.players;
DROP POLICY IF EXISTS "update own" ON public.players;
DROP POLICY IF EXISTS "delete own" ON public.players;
CREATE POLICY "read all players" ON public.players FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own" ON public.players FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own" ON public.players FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "delete own" ON public.players FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.daily_quota (
  day date PRIMARY KEY,
  target int NOT NULL,
  progress int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.daily_quota TO authenticated;
GRANT ALL ON public.daily_quota TO service_role;
ALTER TABLE public.daily_quota ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read quota" ON public.daily_quota;
CREATE POLICY "read quota" ON public.daily_quota FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.get_today_quota()
RETURNS public.daily_quota LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.daily_quota;
BEGIN
  INSERT INTO daily_quota(day, target) VALUES (current_date, 5000 + floor(random()*5001)::int)
  ON CONFLICT (day) DO NOTHING;
  SELECT * INTO r FROM daily_quota WHERE day = current_date;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.deposit_scrap(amount int)
RETURNS public.daily_quota LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.daily_quota;
BEGIN
  IF auth.uid() IS NULL OR amount <= 0 OR amount > 20000 THEN RAISE EXCEPTION 'invalid'; END IF;
  PERFORM get_today_quota();
  UPDATE daily_quota SET progress = progress + amount,
    completed = (progress + amount) >= target WHERE day = current_date RETURNING * INTO r;
  UPDATE players SET total_quota = total_quota + amount WHERE id = auth.uid();
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.get_today_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deposit_scrap(int) TO authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_quota;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.room_containers (id text PRIMARY KEY, owner_id uuid NOT NULL, items jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_containers TO authenticated;
GRANT ALL ON public.room_containers TO service_role;
ALTER TABLE public.room_containers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS containers_owner ON public.room_containers;
CREATE POLICY containers_owner ON public.room_containers FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid() AND jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 10);
CREATE TABLE IF NOT EXISTS public.hourly_scrap_claims (hour bigint NOT NULL, ordinal integer NOT NULL, player_id uuid NOT NULL, claimed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(hour, ordinal));
GRANT SELECT ON public.hourly_scrap_claims TO authenticated;
GRANT ALL ON public.hourly_scrap_claims TO service_role;
ALTER TABLE public.hourly_scrap_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scrap_claims_read ON public.hourly_scrap_claims;
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
DROP TRIGGER IF EXISTS validate_room_container ON public.room_containers;
CREATE TRIGGER validate_room_container BEFORE INSERT OR UPDATE ON public.room_containers FOR EACH ROW EXECUTE FUNCTION public.validate_room_container();