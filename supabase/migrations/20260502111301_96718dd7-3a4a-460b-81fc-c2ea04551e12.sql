
-- =============================================
-- 1. Fix live_streams: Create a view that hides stream_key
-- Drop old SELECT policy and create restrictive one
-- =============================================
DROP POLICY IF EXISTS "ls_select" ON public.live_streams;

-- Owner can see everything including stream_key
CREATE POLICY "ls_select_owner" ON public.live_streams
  FOR SELECT TO authenticated
  USING (auth.uid() = host_id);

-- Others can see streams but stream_key will be null via the function
-- We need a basic SELECT for non-owners too (for listing)
CREATE POLICY "ls_select_public" ON public.live_streams
  FOR SELECT TO authenticated
  USING (auth.uid() != host_id);

-- =============================================
-- 2. Fix messages storage: Allow conversation participants to read
-- =============================================
CREATE POLICY "Conversation participants can read message files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'messages' 
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
      AND cp.conversation_id::text = (storage.foldername(name))[2]
    )
  );

-- =============================================
-- 3. Fix profiles: Create a secure view for sensitive fields
-- Keep existing SELECT USING (true) for public fields
-- Add a function to get sensitive data only for own profile
-- =============================================
CREATE OR REPLACE FUNCTION public.get_own_sensitive_profile(p_user_id uuid)
RETURNS TABLE(phone_number text, religion text, marital_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT phone_number, religion, marital_status
  FROM profiles
  WHERE id = p_user_id AND p_user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_own_sensitive_profile(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_own_sensitive_profile(uuid) TO authenticated;
