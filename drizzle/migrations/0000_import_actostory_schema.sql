CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_.]{3,30}$'),
  CONSTRAINT bio_len CHECK (char_length(coalesce(bio,'')) <= 300),
  CONSTRAINT name_len CHECK (char_length(coalesce(display_name,'')) <= 60)
);
CREATE UNIQUE INDEX profiles_username_key ON public.profiles (lower(username));
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; candidate text; n int := 0;
BEGIN
  base := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1), 'atleta'), '[^a-zA-Z0-9_.]', '', 'g'));
  IF char_length(base) < 3 THEN base := base || 'acto'; END IF;
  base := left(base, 24);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = candidate) LOOP
    n := n + 1; candidate := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, candidate, left(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), 60), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE OR REPLACE FUNCTION public.username_available(_username text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username));
$$;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, username, display_name, avatar_url, is_private, created_at, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_bio(_profile_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bio FROM public.profiles
  WHERE id = _profile_id AND auth.uid() IS NOT NULL AND (is_private = false OR id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.get_profile_bio(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_bio(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.can_view_author(_author uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (_author = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _author AND is_private = false))
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_author(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_view_author(uuid) TO authenticated;

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption text CHECK (char_length(caption) <= 2000),
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (caption IS NOT NULL OR image_path IS NOT NULL)
);
CREATE INDEX posts_created_idx ON public.posts (created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View visible posts" ON public.posts FOR SELECT TO authenticated USING (public.can_view_author(author_id));
CREATE POLICY "Create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Delete own posts" ON public.posts FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View likes on visible posts" ON public.post_likes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
CREATE POLICY "Like visible posts" ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
CREATE POLICY "Remove own likes" ON public.post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX stories_expires_idx ON public.stories (expires_at);
GRANT SELECT, INSERT, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View active visible stories" ON public.stories FOR SELECT TO authenticated
  USING (public.can_view_author(author_id) AND (expires_at > now() OR author_id = auth.uid()));
CREATE POLICY "Create own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Delete own stories" ON public.stories FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Users upload own media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Read own or visible authors media" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.can_view_author(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE TABLE public.workout_plans (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL, source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','template','ai')), questionnaire jsonb NOT NULL DEFAULT '{}'::jsonb, days jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(days) = 'array'), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_plans_owner ON public.workout_plans FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX workout_plans_user_idx ON public.workout_plans(user_id);
CREATE TABLE public.workout_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, plan_id uuid REFERENCES public.workout_plans(id) ON DELETE SET NULL, plan_name text NOT NULL, day_name text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, exercises jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(exercises) = 'array'), notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_sessions_owner ON public.workout_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND (plan_id IS NULL OR EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())));
CREATE INDEX workout_sessions_user_idx ON public.workout_sessions(user_id, started_at DESC);
CREATE TABLE public.workout_ai_access (user_id uuid PRIMARY KEY, denial_message text NOT NULL, blocked_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.workout_ai_access TO authenticated;
GRANT ALL ON public.workout_ai_access TO service_role;
ALTER TABLE public.workout_ai_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_ai_access_owner_read ON public.workout_ai_access FOR SELECT TO authenticated USING (user_id = auth.uid());