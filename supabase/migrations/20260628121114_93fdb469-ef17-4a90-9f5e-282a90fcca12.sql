CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  u RECORD;
  base_username text;
  final_username text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RETURN;
  END IF;

  SELECT * INTO u FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compte auth introuvable';
  END IF;

  base_username := COALESCE(NULLIF(u.raw_user_meta_data->>'username', ''), NULLIF(split_part(u.email, '@', 1), ''), 'user');
  base_username := regexp_replace(left(base_username, 40), '[^a-zA-Z0-9_''.-]', '_', 'g');

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = base_username AND id <> auth.uid()) THEN
    final_username := left(base_username, 24) || '_' || replace(substr(auth.uid()::text, 1, 8), '-', '');
  ELSE
    final_username := base_username;
  END IF;

  INSERT INTO public.profiles (
    id, username, full_name, avatar_url, phone_number, region, created_at, updated_at
  ) VALUES (
    auth.uid(),
    final_username,
    COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(split_part(u.email, '@', 1), ''), 'Utilisateur'),
    NULLIF(u.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(u.raw_user_meta_data->>'phone_number', ''),
    NULLIF(u.raw_user_meta_data->>'region', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_self_insert_repair ON public.profiles;
CREATE POLICY profiles_self_insert_repair ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS profiles_self_update_repair ON public.profiles;
CREATE POLICY profiles_self_update_repair ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS live_streams_read_public_repair ON public.live_streams;
CREATE POLICY live_streams_read_public_repair ON public.live_streams
FOR SELECT TO anon, authenticated
USING (COALESCE(privacy, 'public') = 'public' OR auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS live_streams_create_owner_repair ON public.live_streams;
CREATE POLICY live_streams_create_owner_repair ON public.live_streams
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS live_streams_update_owner_repair ON public.live_streams;
CREATE POLICY live_streams_update_owner_repair ON public.live_streams
FOR UPDATE TO authenticated
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS live_streams_delete_owner_repair ON public.live_streams;
CREATE POLICY live_streams_delete_owner_repair ON public.live_streams
FOR DELETE TO authenticated
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

ALTER TABLE public.live_stream_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS live_stream_comments_read_public_repair ON public.live_stream_comments;
CREATE POLICY live_stream_comments_read_public_repair ON public.live_stream_comments
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id = live_stream_comments.stream_id
      AND (COALESCE(ls.privacy, 'public') = 'public' OR ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  )
);

DROP POLICY IF EXISTS live_stream_comments_create_auth_repair ON public.live_stream_comments;
CREATE POLICY live_stream_comments_create_auth_repair ON public.live_stream_comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

ALTER TABLE public.voice_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS voice_messages_read_repair ON public.voice_messages;
CREATE POLICY voice_messages_read_repair ON public.voice_messages
FOR SELECT TO authenticated
USING (public.can_access_message(message_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS voice_messages_create_repair ON public.voice_messages;
CREATE POLICY voice_messages_create_repair ON public.voice_messages
FOR INSERT TO authenticated
WITH CHECK (public.can_access_message(message_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS recordings_host_insert_repair ON storage.objects;
CREATE POLICY recordings_host_insert_repair ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND (ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  )
);

DROP POLICY IF EXISTS recordings_read_repair ON storage.objects;
CREATE POLICY recordings_read_repair ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND (COALESCE(ls.privacy, 'public') = 'public' OR ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  )
);

DROP POLICY IF EXISTS messages_owner_read_repair ON storage.objects;
CREATE POLICY messages_owner_read_repair ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'messages'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.voice_messages vm
      WHERE vm.audio_url = storage.objects.name
        AND public.can_access_message(vm.message_id, auth.uid())
    )
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS messages_owner_insert_repair ON storage.objects;
CREATE POLICY messages_owner_insert_repair ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'messages' AND split_part(name, '/', 1) = auth.uid()::text);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_streams_host_id_fkey') THEN
    ALTER TABLE public.live_streams DROP CONSTRAINT live_streams_host_id_fkey;
  END IF;
  ALTER TABLE public.live_streams
    ADD CONSTRAINT live_streams_host_id_fkey
    FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;