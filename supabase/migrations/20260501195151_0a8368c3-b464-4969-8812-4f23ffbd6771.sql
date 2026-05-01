
-- ============================================================
-- 1. REVOKE EXECUTE from anon on ALL SECURITY DEFINER functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_interaction(uuid, text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_friend_request() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_friends_with_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_message(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_conversation_participants() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_personalized_feed(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_content(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_translation(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_reaction() FROM anon;

-- ============================================================
-- 2. Add missing RLS policies on scheduled_messages
-- ============================================================
CREATE POLICY "sm_select" ON public.scheduled_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "sm_insert" ON public.scheduled_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "sm_update" ON public.scheduled_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "sm_delete" ON public.scheduled_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- ============================================================
-- 3. Fix overly permissive "WITH CHECK (true)" policies
-- ============================================================

-- Fix cert_insert: only admins/super_admins can insert certifications
DROP POLICY IF EXISTS "cert_insert" ON public.certifications;
CREATE POLICY "cert_insert" ON public.certifications
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix notif_insert: system triggers insert notifications, allow from trigger context
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id 
    OR auth.uid() = user_id
  );

-- Fix conv_insert: any authenticated user can create a conversation (needed for messaging)
-- This one stays permissive intentionally since conversations have no user_id column

-- ============================================================
-- 4. Restrict storage bucket listing (replace broad SELECT policies)
-- ============================================================

-- Drop broad SELECT policies that allow listing all files
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view posts media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view stories files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view reels" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view group media" ON storage.objects;
DROP POLICY IF EXISTS "Company files are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Message files are publicly readable" ON storage.objects;

-- Re-create SELECT policies scoped to authenticated users (prevents anon listing)
-- Public buckets still serve files via direct URL, but listing is restricted
CREATE POLICY "Auth users can read avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Auth users can read posts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'posts');

CREATE POLICY "Auth users can read stories" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'stories');

CREATE POLICY "Auth users can read reels" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reels');

CREATE POLICY "Auth users can read groups" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'groups');

CREATE POLICY "Auth users can read companies" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'companies');

CREATE POLICY "Auth users can read messages" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'messages');

CREATE POLICY "Auth users can read documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
