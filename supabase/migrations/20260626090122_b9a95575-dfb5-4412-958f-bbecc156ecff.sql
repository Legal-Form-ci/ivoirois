-- RLS / CRUD / Live replay hardening and repair
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Backfill-safe profile creation for auth users referenced by social modules
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
  base_username := left(base_username, 40);

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = base_username AND id <> _user_id) THEN
    final_username := left(base_username, 24) || '_' || replace(substr(_user_id::text, 1, 8), '-', '');
  ELSE
    final_username := base_username;
  END IF;

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    phone_number,
    region,
    created_at,
    updated_at
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
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

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

-- Ensure every existing auth user has a profile before FK checks
SELECT public.ensure_profile_for(id) FROM auth.users;

-- Add profile/company/page relationship fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS company_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_company_id_fkey') THEN
    ALTER TABLE public.pages
      ADD CONSTRAINT pages_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.company_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Membre',
  title text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT ON public.company_team_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_team_members TO authenticated;
GRANT ALL ON public.company_team_members TO service_role;
ALTER TABLE public.company_team_members ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_company_team_members_updated_at ON public.company_team_members;
CREATE TRIGGER update_company_team_members_updated_at
BEFORE UPDATE ON public.company_team_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public projects module for CRUD
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'active',
  location text,
  website text,
  cover_image text,
  start_date date,
  end_date date,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add missing FK constraints for new rows without breaking legacy rows
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_created_by_fkey') THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_posts_created_by_fkey') THEN
    ALTER TABLE public.job_posts ADD CONSTRAINT job_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='events')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_created_by_fkey') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='groups')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_created_by_fkey') THEN
    ALTER TABLE public.groups ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='resumes')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resumes_user_id_fkey') THEN
    ALTER TABLE public.resumes ADD CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- Ensure profiles exist before modules with profile FKs are written
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
    ('projects', 'created_by')
  ) AS v(table_name, column_name)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=item.table_name AND column_name=item.column_name) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS ensure_profile_before_%I_write ON public.%I', item.table_name, item.table_name);
      EXECUTE format('CREATE TRIGGER ensure_profile_before_%I_write BEFORE INSERT OR UPDATE OF %I ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_trigger(%L)', item.table_name, item.column_name, item.table_name, item.column_name);
    END IF;
  END LOOP;
END $$;

-- Defaults and anti-duplicate indexes
UPDATE public.live_streams SET privacy = 'public' WHERE privacy IS NULL;
ALTER TABLE public.live_streams ALTER COLUMN privacy SET DEFAULT 'public';
ALTER TABLE public.live_streams ALTER COLUMN status SET DEFAULT 'live';
ALTER TABLE public.live_streams ALTER COLUMN viewers_count SET DEFAULT 0;
ALTER TABLE public.live_streams ALTER COLUMN peak_viewers SET DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendees_unique_user ON public.event_attendees(event_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_followers_unique_user ON public.page_followers(page_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_participants_unique_user ON public.conversation_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status_privacy ON public.live_streams(status, privacy, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_comments_stream_created ON public.live_stream_comments(stream_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_status_created ON public.marketplace_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_company_team_members_company ON public.company_team_members(company_id);

-- Safe view counter: spectators can increase counts without broad update access
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
GRANT EXECUTE ON FUNCTION public.increment_live_viewer(uuid) TO anon, authenticated;

-- Grants for tables used by client CRUD
GRANT SELECT ON public.live_streams, public.live_stream_comments, public.marketplace_listings, public.event_attendees, public.companies, public.pages, public.page_followers, public.job_posts, public.events, public.projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_streams, public.live_stream_comments, public.marketplace_listings, public.event_attendees, public.companies, public.pages, public.page_followers, public.job_posts, public.events, public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations, public.conversation_participants, public.messages TO authenticated;
GRANT ALL ON public.live_streams, public.live_stream_comments, public.marketplace_listings, public.event_attendees, public.companies, public.pages, public.page_followers, public.job_posts, public.events, public.projects, public.conversations, public.conversation_participants, public.messages TO service_role;

-- Rebuild RLS policies for concerned modules
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['live_streams','live_stream_comments','conversations','conversation_participants','messages','marketplace_listings','event_attendees','companies','pages','page_followers','job_posts','events','projects','company_team_members']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- live_streams
CREATE POLICY live_streams_read_public ON public.live_streams FOR SELECT TO anon, authenticated
USING (COALESCE(privacy, 'public') = 'public' OR auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY live_streams_create_owner ON public.live_streams FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY live_streams_update_owner ON public.live_streams FOR UPDATE TO authenticated
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY live_streams_delete_owner ON public.live_streams FOR DELETE TO authenticated
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'));

-- live_stream_comments
CREATE POLICY live_comments_read_visible_stream ON public.live_stream_comments FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.live_streams ls
  WHERE ls.id = live_stream_comments.stream_id
    AND (COALESCE(ls.privacy, 'public') = 'public' OR ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
));
CREATE POLICY live_comments_create_visible_stream ON public.live_stream_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.live_streams ls
  WHERE ls.id = live_stream_comments.stream_id
    AND (COALESCE(ls.privacy, 'public') = 'public' OR ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
));
CREATE POLICY live_comments_update_owner ON public.live_stream_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY live_comments_delete_owner_host ON public.live_stream_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR EXISTS (
  SELECT 1 FROM public.live_streams ls WHERE ls.id = live_stream_comments.stream_id AND ls.host_id = auth.uid()
));

-- conversations and participants
CREATE POLICY conversations_create_auth ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY conversations_read_participant ON public.conversations FOR SELECT TO authenticated
USING (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY conversations_update_participant ON public.conversations FOR UPDATE TO authenticated
USING (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY conversations_delete_participant ON public.conversations FOR DELETE TO authenticated
USING (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY conversation_participants_read ON public.conversation_participants FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY conversation_participants_create ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY conversation_participants_update_self ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY conversation_participants_delete_self ON public.conversation_participants FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY messages_read_participants ON public.messages FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY messages_create_sender ON public.messages FOR INSERT TO authenticated
WITH CHECK ((sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid())) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY messages_update_sender ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (sender_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY messages_delete_sender ON public.messages FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- marketplace
CREATE POLICY marketplace_read_public ON public.marketplace_listings FOR SELECT TO anon, authenticated
USING (COALESCE(status, 'active') = 'active' OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY marketplace_create_seller ON public.marketplace_listings FOR INSERT TO authenticated
WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY marketplace_update_seller ON public.marketplace_listings FOR UPDATE TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY marketplace_delete_seller ON public.marketplace_listings FOR DELETE TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- events and attendees
CREATE POLICY events_read_public ON public.events FOR SELECT TO anon, authenticated
USING (COALESCE(privacy, 'public') = 'public' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY events_create_owner ON public.events FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY events_update_owner ON public.events FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY events_delete_owner ON public.events FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY event_attendees_read_visible ON public.event_attendees FOR SELECT TO anon, authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.id = event_attendees.event_id
    AND (COALESCE(e.privacy, 'public') = 'public' OR e.created_by = auth.uid())
));
CREATE POLICY event_attendees_create_self ON public.event_attendees FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.id = event_attendees.event_id
    AND (COALESCE(e.privacy, 'public') = 'public' OR e.created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
));
CREATE POLICY event_attendees_update_self_or_owner ON public.event_attendees FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_attendees.event_id AND e.created_by = auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_attendees.event_id AND e.created_by = auth.uid()));
CREATE POLICY event_attendees_delete_self_or_owner ON public.event_attendees FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_attendees.event_id AND e.created_by = auth.uid()));

-- companies, team, pages, page followers, jobs, projects
CREATE POLICY companies_read_public ON public.companies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY companies_create_owner ON public.companies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY companies_update_owner ON public.companies FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY companies_delete_owner ON public.companies FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY company_team_read_public ON public.company_team_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY company_team_create_owner ON public.company_team_members FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_team_members.company_id AND c.created_by = auth.uid()));
CREATE POLICY company_team_update_owner ON public.company_team_members FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_team_members.company_id AND c.created_by = auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_team_members.company_id AND c.created_by = auth.uid()));
CREATE POLICY company_team_delete_owner ON public.company_team_members FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_team_members.company_id AND c.created_by = auth.uid()));

CREATE POLICY pages_read_public ON public.pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pages_create_owner ON public.pages FOR INSERT TO authenticated
WITH CHECK ((created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) AND (company_id IS NULL OR public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = pages.company_id AND c.created_by = auth.uid()) OR EXISTS (SELECT 1 FROM public.company_team_members m WHERE m.company_id = pages.company_id AND m.user_id = auth.uid())));
CREATE POLICY pages_update_owner ON public.pages FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY pages_delete_owner ON public.pages FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY page_followers_read_public ON public.page_followers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY page_followers_create_self ON public.page_followers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY page_followers_delete_self ON public.page_followers FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY jobs_read_public ON public.job_posts FOR SELECT TO anon, authenticated USING (COALESCE(status, 'active') = 'active' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY jobs_create_owner_company ON public.job_posts FOR INSERT TO authenticated
WITH CHECK ((created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) AND (public.has_role(auth.uid(), 'super_admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = job_posts.company_id AND c.created_by = auth.uid()) OR EXISTS (SELECT 1 FROM public.company_team_members m WHERE m.company_id = job_posts.company_id AND m.user_id = auth.uid())));
CREATE POLICY jobs_update_owner ON public.job_posts FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY jobs_delete_owner ON public.job_posts FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY projects_read_public ON public.projects FOR SELECT TO anon, authenticated USING (is_public = true OR created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY projects_create_owner ON public.projects FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY projects_update_owner ON public.projects FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY projects_delete_owner ON public.projects FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- Keep realtime active for live/replay/chat modules
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['live_streams','live_stream_comments','conversations','conversation_participants','messages','marketplace_listings','event_attendees','companies','pages','job_posts','events','projects']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t)
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;