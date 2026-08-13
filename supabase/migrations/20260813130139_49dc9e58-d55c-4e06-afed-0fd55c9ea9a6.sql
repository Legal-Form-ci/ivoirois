-- 1. PROFILES: column-level security for sensitive fields
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, full_name, avatar_url, bio, location, created_at, updated_at, region, profession, sector, "position", experience_level, years_of_experience, education_level, interests, is_online, last_seen, cover_url) ON public.profiles TO authenticated;

-- 2. LIVE_STREAMS: hide stream_key from viewers
REVOKE SELECT ON public.live_streams FROM anon, authenticated;
GRANT SELECT (id, host_id, title, description, thumbnail_url, status, privacy, viewers_count, peak_viewers, started_at, ended_at, scheduled_at, created_at, recording_url, recording_enabled) ON public.live_streams TO anon, authenticated;

-- 3. GROUP_MEMBERS: restrict membership visibility for private groups
DROP POLICY IF EXISTS "gm_select" ON public.group_members;
CREATE POLICY "gm_select" ON public.group_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
      AND (
        COALESCE(g.privacy, 'public') = 'public'
        OR g.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.group_members me
          WHERE me.group_id = g.id AND me.user_id = auth.uid()
        )
      )
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 4. SECURITY DEFINER functions: revoke direct API execution where not needed
REVOKE EXECUTE ON FUNCTION public.can_access_message(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_enrollment_progress(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_lesson_progress_recompute() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_login_identifier(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_live_viewer(uuid) FROM PUBLIC, anon;