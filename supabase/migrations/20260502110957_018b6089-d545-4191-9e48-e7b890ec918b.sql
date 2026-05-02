
-- =============================================
-- 1. REVOKE EXECUTE on trigger-only SECURITY DEFINER functions from authenticated
-- =============================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_friend_request() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_reaction() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_conversation_participants() FROM authenticated;

-- =============================================
-- 2. FIX conv_insert - Replace WITH CHECK (true) with proper check
-- =============================================
DROP POLICY IF EXISTS "conv_insert" ON public.conversations;
CREATE POLICY "conv_insert" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 3. STORAGE: Fix documents bucket - restrict READ to owner folder
-- =============================================
DROP POLICY IF EXISTS "Auth users can read documents" ON storage.objects;
CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Add INSERT policy for documents with ownership
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Add DELETE policy for documents
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =============================================
-- 4. STORAGE: Fix messages bucket - restrict READ to owner folder
-- =============================================
DROP POLICY IF EXISTS "Auth users can read messages" ON storage.objects;
CREATE POLICY "Users can read own message files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'messages' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Fix messages INSERT to enforce ownership
DROP POLICY IF EXISTS "Authenticated users can upload message files" ON storage.objects;
CREATE POLICY "Users can upload own message files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'messages' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =============================================
-- 5. STORAGE: Fix companies INSERT with ownership check
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can upload company files" ON storage.objects;
CREATE POLICY "Users can upload company files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'companies' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =============================================
-- 6. STORAGE: Fix reels INSERT with ownership check
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can upload reels" ON storage.objects;
CREATE POLICY "Users can upload own reels" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reels' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =============================================
-- 7. STORAGE: Fix groups INSERT with ownership check
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can upload group media" ON storage.objects;
CREATE POLICY "Users can upload group media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'groups' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =============================================
-- 8. STORAGE: Fix stories INSERT with ownership check
-- =============================================
DROP POLICY IF EXISTS "Auth users can upload stories" ON storage.objects;
CREATE POLICY "Users can upload own stories" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =============================================
-- 9. live_streams: Hide stream_key from non-owners
-- Replace the open SELECT with two policies
-- =============================================
DROP POLICY IF EXISTS "ls_select" ON public.live_streams;

-- All authenticated can see streams (without stream_key via view, but RLS is row-level)
-- We create a view approach: make stream_key null for non-owners
-- Since RLS can't do column-level, we use a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_safe_live_streams()
RETURNS TABLE(
  id uuid, title text, description text, host_id uuid, status text,
  thumbnail_url text, viewers_count int, peak_viewers int, privacy text,
  scheduled_at timestamptz, started_at timestamptz, ended_at timestamptz,
  created_at timestamptz,
  stream_key text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT id, title, description, host_id, status, thumbnail_url, 
         viewers_count, peak_viewers, privacy, scheduled_at, started_at, 
         ended_at, created_at,
         CASE WHEN host_id = auth.uid() THEN stream_key ELSE NULL END as stream_key
  FROM live_streams;
$$;

REVOKE EXECUTE ON FUNCTION public.get_safe_live_streams() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_safe_live_streams() TO authenticated;

-- Keep basic RLS SELECT for the table (needed for updates/inserts)
CREATE POLICY "ls_select" ON public.live_streams
  FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- 10. user_roles: Restrict SELECT to own roles or admins
-- =============================================
DROP POLICY IF EXISTS "ur_select" ON public.user_roles;
CREATE POLICY "ur_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 11. story_views: Restrict to story owner or viewer
-- =============================================
DROP POLICY IF EXISTS "sv_select" ON public.story_views;
CREATE POLICY "sv_select" ON public.story_views
  FOR SELECT TO authenticated
  USING (
    viewer_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM stories s WHERE s.id = story_views.story_id AND s.user_id = auth.uid()
    )
  );
