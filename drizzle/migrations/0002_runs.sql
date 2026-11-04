CREATE TABLE public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  distance_m double precision NOT NULL CHECK (distance_m >= 0),
  active_seconds integer NOT NULL CHECK (active_seconds >= 0),
  avg_pace_s_per_km double precision,
  best_pace_s_per_km double precision,
  avg_speed_kmh double precision,
  calories integer NOT NULL DEFAULT 0,
  route jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(route) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runs TO authenticated;
GRANT ALL ON public.runs TO service_role;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY runs_owner ON public.runs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY runs_no_guest_write ON public.runs AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_guest());
CREATE INDEX runs_user_idx ON public.runs(user_id, started_at DESC);