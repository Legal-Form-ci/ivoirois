
-- 1. RPCs must not trust caller-supplied user ids
CREATE OR REPLACE FUNCTION public.get_friends_with_status(p_user_id uuid)
RETURNS TABLE(friend_id uuid, full_name text, username text, avatar_url text, is_online boolean, last_seen timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.username, p.avatar_url, p.is_online, p.last_seen
  FROM friendships f
  JOIN profiles p ON (
    CASE WHEN f.user_id = p_user_id THEN f.friend_id = p.id ELSE f.user_id = p.id END
  )
  WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
    AND f.status = 'accepted'
  ORDER BY p.is_online DESC, p.last_seen DESC NULLS LAST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_count bigint;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT COUNT(*) INTO v_count
  FROM messages m
  JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = p_user_id AND m.sender_id <> p_user_id AND m.read = false;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_interaction(p_user_id uuid, p_content_type text, p_content_id uuid, p_interaction_type text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_weight numeric;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF p_interaction_type IS NULL OR p_interaction_type NOT IN ('view','like','comment','share','save') THEN
    RAISE EXCEPTION 'Type d''interaction invalide';
  END IF;
  IF p_content_type IS NULL OR length(p_content_type) > 40 THEN
    RAISE EXCEPTION 'Type de contenu invalide';
  END IF;
  v_weight := CASE p_interaction_type
    WHEN 'view' THEN 1.0 WHEN 'like' THEN 2.0 WHEN 'comment' THEN 3.0
    WHEN 'share' THEN 4.0 WHEN 'save' THEN 5.0 ELSE 1.0 END;
  INSERT INTO user_interactions (user_id, content_type, content_id, interaction_type, weight)
  VALUES (p_user_id, p_content_type, p_content_id, p_interaction_type, v_weight)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- 2. Badge engine: admins only
CREATE OR REPLACE FUNCTION public.run_badge_engine(_user_id uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  b RECORD; u RECORD; granted int := 0; ok boolean;
  v_posts int; v_friends int; v_courses int;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  FOR u IN SELECT id, created_at, full_name, bio, avatar_url, profession, region FROM public.profiles
           WHERE _user_id IS NULL OR id = _user_id LOOP
    SELECT COUNT(*) INTO v_posts FROM public.posts WHERE user_id = u.id;
    SELECT COUNT(*) INTO v_friends FROM public.friendships WHERE status = 'accepted' AND (user_id = u.id OR friend_id = u.id);
    SELECT COUNT(*) INTO v_courses FROM public.courses WHERE instructor_id = u.id;

    FOR b IN SELECT * FROM public.badge_definitions WHERE active AND auto_assign LOOP
      ok := true;
      IF b.rules ? 'min_posts' AND v_posts < (b.rules->>'min_posts')::int THEN ok := false; END IF;
      IF b.rules ? 'min_friends' AND v_friends < (b.rules->>'min_friends')::int THEN ok := false; END IF;
      IF b.rules ? 'min_courses' AND v_courses < (b.rules->>'min_courses')::int THEN ok := false; END IF;
      IF b.rules ? 'joined_before' AND u.created_at >= (b.rules->>'joined_before')::timestamptz THEN ok := false; END IF;
      IF b.rules ? 'has_role' AND NOT public.has_role(u.id, (b.rules->>'has_role')::app_role) THEN ok := false; END IF;
      IF b.rules ? 'profile_complete' AND (b.rules->>'profile_complete')::boolean THEN
        IF COALESCE(u.bio,'') = '' OR COALESCE(u.avatar_url,'') = '' OR COALESCE(u.profession,'') = '' THEN ok := false; END IF;
      END IF;

      IF ok THEN
        INSERT INTO public.user_badges (user_id, badge_id, is_auto, awarded_reason)
        VALUES (u.id, b.id, true, 'Attribution automatique')
        ON CONFLICT (user_id, badge_id) DO NOTHING;
        IF FOUND THEN granted := granted + 1; END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN granted;
END;
$function$;

-- 3. badge_history is an audit trail: written only by the system trigger
DROP POLICY IF EXISTS "bh_insert" ON public.badge_history;
CREATE POLICY "bh_admin_insert" ON public.badge_history
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);
REVOKE INSERT, UPDATE, DELETE ON public.badge_history FROM anon;
REVOKE SELECT ON public.badge_history FROM anon;
REVOKE UPDATE, DELETE ON public.badge_history FROM authenticated;

-- 4. Remove the username -> email enumeration helper
DROP FUNCTION IF EXISTS public.resolve_login_identifier(text);

-- 5. Trigger-only / internal functions must not be callable from the API
REVOKE ALL ON FUNCTION public.log_user_badge_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_profile_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_enrollment_progress(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_message(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon, authenticated;
