-- Global CRUD / triggers / live replay repair

-- 1) Core profile helpers (public only; no auth schema trigger)
CREATE OR REPLACE FUNCTION public.ensure_profile_for(_user_id uuid)
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
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RETURN;
  END IF;

  SELECT * INTO u FROM auth.users WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  base_username := COALESCE(NULLIF(u.raw_user_meta_data->>'username', ''), NULLIF(split_part(u.email, '@', 1), ''), 'user');
  base_username := regexp_replace(left(base_username, 40), '[^a-zA-Z0-9_''.-]', '_', 'g');

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = base_username AND id <> _user_id) THEN
    final_username := left(base_username, 24) || '_' || replace(substr(_user_id::text, 1, 8), '-', '');
  ELSE
    final_username := base_username;
  END IF;

  INSERT INTO public.profiles (
    id, username, full_name, avatar_url, phone_number, region, created_at, updated_at
  ) VALUES (
    _user_id,
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
REVOKE ALL ON FUNCTION public.ensure_profile_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_for(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  PERFORM public.ensure_profile_for(auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ensure_profile_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v uuid;
BEGIN
  IF TG_ARGV[0] IS NULL THEN
    RETURN NEW;
  END IF;
  v := NULLIF(to_jsonb(NEW)->>TG_ARGV[0], '')::uuid;
  IF v IS NOT NULL THEN
    PERFORM public.ensure_profile_for(v);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_profile_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_trigger() TO service_role;

-- 2) Timestamps and operational helpers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.update_conversation_timestamp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_conversation_timestamp() TO service_role;

CREATE OR REPLACE FUNCTION public.mark_message_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NEW.delivered_at IS NULL THEN
    NEW.delivered_at = now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_message_delivered() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_message_delivered() TO service_role;

CREATE OR REPLACE FUNCTION public.increment_live_viewer(_stream_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  UPDATE public.live_streams
  SET viewers_count = COALESCE(viewers_count, 0) + 1,
      peak_viewers = GREATEST(COALESCE(peak_viewers, 0), COALESCE(viewers_count, 0) + 1)
  WHERE id = _stream_id
    AND (COALESCE(privacy, 'public') = 'public' OR host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
END;
$$;
REVOKE ALL ON FUNCTION public.increment_live_viewer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_live_viewer(uuid) TO anon, authenticated, service_role;

-- 3) Ensure columns/defaults needed by client flows
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS recording_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

UPDATE public.live_streams SET privacy = 'public' WHERE privacy IS NULL;
ALTER TABLE public.live_streams ALTER COLUMN privacy SET DEFAULT 'public';
ALTER TABLE public.live_streams ALTER COLUMN status SET DEFAULT 'live';
ALTER TABLE public.live_streams ALTER COLUMN viewers_count SET DEFAULT 0;
ALTER TABLE public.live_streams ALTER COLUMN peak_viewers SET DEFAULT 0;

-- Backfill profiles for existing auth users referenced by future FK writes
SELECT public.ensure_profile_for(id) FROM auth.users;

-- 4) Recreate public-table triggers (database currently had none)
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('live_streams', 'host_id'),
    ('live_stream_comments', 'user_id'),
    ('marketplace_listings', 'seller_id'),
    ('event_attendees', 'user_id'),
    ('companies', 'created_by'),
    ('pages', 'created_by'),
    ('job_posts', 'created_by'),
    ('resumes', 'user_id'),
    ('groups', 'created_by'),
    ('posts', 'user_id'),
    ('projects', 'created_by'),
    ('comments', 'user_id'),
    ('reels', 'user_id'),
    ('stories', 'user_id')
  ) AS v(table_name, column_name)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=item.table_name AND column_name=item.column_name) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS ensure_profile_before_%I_write ON public.%I', item.table_name, item.table_name);
      EXECUTE format('CREATE TRIGGER ensure_profile_before_%I_write BEFORE INSERT OR UPDATE OF %I ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_trigger(%L)', item.table_name, item.column_name, item.table_name, item.column_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','companies','company_team_members','pages','groups','job_posts','events','projects','marketplace_listings','posts','comments','messages','conversations','reels','stories','resumes','scheduled_posts','scheduled_messages','live_streams']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='updated_at') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    END IF;
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS messages_set_delivered_at ON public.messages;
CREATE TRIGGER messages_set_delivered_at
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mark_message_delivered();

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- Notification triggers, fail-safe if dependent columns exist
DROP TRIGGER IF EXISTS notify_like_trigger ON public.likes;
CREATE TRIGGER notify_like_trigger
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

DROP TRIGGER IF EXISTS notify_comment_trigger ON public.comments;
CREATE TRIGGER notify_comment_trigger
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

DROP TRIGGER IF EXISTS notify_friendship_trigger ON public.friendships;
CREATE TRIGGER notify_friendship_trigger
AFTER INSERT OR UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_request();

-- 5) Grants and indexes for CRUD modules
GRANT SELECT ON public.live_streams, public.live_stream_comments, public.marketplace_listings, public.event_attendees, public.companies, public.pages, public.page_followers, public.job_posts, public.events, public.projects, public.groups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_streams, public.live_stream_comments, public.marketplace_listings, public.event_attendees, public.companies, public.pages, public.page_followers, public.job_posts, public.events, public.projects, public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations, public.conversation_participants, public.messages, public.voice_messages, public.message_attachments TO authenticated;
GRANT ALL ON public.live_streams, public.live_stream_comments, public.marketplace_listings, public.event_attendees, public.companies, public.pages, public.page_followers, public.job_posts, public.events, public.projects, public.groups, public.conversations, public.conversation_participants, public.messages, public.voice_messages, public.message_attachments TO service_role;

CREATE INDEX IF NOT EXISTS idx_live_streams_status_privacy ON public.live_streams(status, privacy, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_comments_stream_created ON public.live_stream_comments(stream_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_voice_messages_message ON public.voice_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_status_created ON public.marketplace_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- 6) Repair selected RLS policies to keep CRUD permissive for signed-in users while preserving ownership
DO $$
DECLARE
  p record;
BEGIN
  FOREACH p IN ARRAY ARRAY[]::record[] LOOP NULL; END LOOP;
END $$;

-- live_streams
DROP POLICY IF EXISTS live_streams_read_public ON public.live_streams;
DROP POLICY IF EXISTS live_streams_create_owner ON public.live_streams;
DROP POLICY IF EXISTS live_streams_update_owner ON public.live_streams;
DROP POLICY IF EXISTS live_streams_delete_owner ON public.live_streams;
CREATE POLICY live_streams_read_public ON public.live_streams FOR SELECT TO anon, authenticated
USING (COALESCE(privacy, 'public') = 'public' OR auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY live_streams_create_owner ON public.live_streams FOR INSERT TO authenticated
WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY live_streams_update_owner ON public.live_streams FOR UPDATE TO authenticated
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY live_streams_delete_owner ON public.live_streams FOR DELETE TO authenticated
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'));

-- voice messages: users read/create inside conversations they can access
DROP POLICY IF EXISTS vm_select ON public.voice_messages;
DROP POLICY IF EXISTS vm_insert ON public.voice_messages;
DROP POLICY IF EXISTS voice_messages_read ON public.voice_messages;
DROP POLICY IF EXISTS voice_messages_create ON public.voice_messages;
CREATE POLICY voice_messages_read ON public.voice_messages FOR SELECT TO authenticated
USING (public.can_access_message(message_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY voice_messages_create ON public.voice_messages FOR INSERT TO authenticated
WITH CHECK (public.can_access_message(message_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

-- groups: allow public discovery, owner/super-admin writes
DROP POLICY IF EXISTS groups_select ON public.groups;
DROP POLICY IF EXISTS groups_insert ON public.groups;
DROP POLICY IF EXISTS groups_update ON public.groups;
DROP POLICY IF EXISTS groups_delete ON public.groups;
DROP POLICY IF EXISTS groups_read_public ON public.groups;
DROP POLICY IF EXISTS groups_create_owner ON public.groups;
DROP POLICY IF EXISTS groups_update_owner ON public.groups;
DROP POLICY IF EXISTS groups_delete_owner ON public.groups;
CREATE POLICY groups_read_public ON public.groups FOR SELECT TO anon, authenticated
USING (COALESCE(privacy, 'public') = 'public' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY groups_create_owner ON public.groups FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY groups_update_owner ON public.groups FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY groups_delete_owner ON public.groups FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- 7) Storage policies for private buckets using signed URLs and route-authorized ownership
DROP POLICY IF EXISTS recordings_host_insert ON storage.objects;
CREATE POLICY recordings_host_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND (ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
);

DROP POLICY IF EXISTS recordings_host_update ON storage.objects;
CREATE POLICY recordings_host_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND (ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
)
WITH CHECK (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND (ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
);

DROP POLICY IF EXISTS recordings_host_delete ON storage.objects;
CREATE POLICY recordings_host_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND (ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
);

DROP POLICY IF EXISTS recordings_read ON storage.objects;
CREATE POLICY recordings_read ON storage.objects
FOR SELECT TO authenticated, anon
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND (COALESCE(ls.privacy, 'public') = 'public' OR ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
);

DROP POLICY IF EXISTS messages_owner_insert ON storage.objects;
CREATE POLICY messages_owner_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'messages' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS messages_owner_read ON storage.objects;
CREATE POLICY messages_owner_read ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'messages' AND split_part(name, '/', 1) = auth.uid()::text);

-- Keep exposed SECURITY DEFINER functions limited to intended callers
REVOKE ALL ON FUNCTION public.ensure_profile_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_profile_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_conversation_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_message_delivered() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_live_viewer(uuid) TO anon, authenticated;
