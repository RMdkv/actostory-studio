CREATE OR REPLACE FUNCTION public.is_guest() RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;
GRANT EXECUTE ON FUNCTION public.is_guest() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_author(_author uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (_author = auth.uid() OR (NOT public.is_guest() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _author AND is_private = false)))
$$;
CREATE OR REPLACE FUNCTION public.get_profile_bio(_profile_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bio FROM public.profiles
  WHERE id = _profile_id AND auth.uid() IS NOT NULL
    AND (id = auth.uid() OR (NOT public.is_guest() AND is_private = false))
$$;

CREATE POLICY "Guests see only own profile" ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_guest() OR id = auth.uid());
CREATE POLICY "Guests cannot edit profiles" ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_guest());
CREATE POLICY "Guests cannot post" ON public.posts AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_guest());
CREATE POLICY "Guests cannot delete posts" ON public.posts AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_guest());
CREATE POLICY "Guests cannot like" ON public.post_likes AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_guest());
CREATE POLICY "Guests cannot see likes" ON public.post_likes AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_guest());
CREATE POLICY "Guests cannot post stories" ON public.stories AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_guest());
CREATE POLICY "Guests cannot upload media" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id <> 'media' OR NOT public.is_guest());