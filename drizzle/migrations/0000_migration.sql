CREATE TABLE public.players (
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
GRANT SELECT ON public.players TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all players" ON public.players FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own" ON public.players FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own" ON public.players FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "delete own" ON public.players FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.daily_quota (
  day date PRIMARY KEY,
  target int NOT NULL,
  progress int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.daily_quota TO authenticated;
GRANT ALL ON public.daily_quota TO service_role;
ALTER TABLE public.daily_quota ENABLE ROW LEVEL SECURITY;
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
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_quota;