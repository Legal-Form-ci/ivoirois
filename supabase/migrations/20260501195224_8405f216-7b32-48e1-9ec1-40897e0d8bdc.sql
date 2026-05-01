
-- ============================================================
-- 1. Revoke from PUBLIC role (anon inherits from public)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM public;
REVOKE EXECUTE ON FUNCTION public.record_interaction(uuid, text, uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_on_friend_request() FROM public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_friends_with_status(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_unread_count(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.can_access_message(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.validate_conversation_participants() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_personalized_feed(uuid, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.search_content(text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_platform_stats() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_translation(text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_on_reaction() FROM public;

-- Re-grant to authenticated for functions called via client SDK
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_interaction(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_with_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_message(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_personalized_feed(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_content(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_translation(text, text) TO authenticated;

-- Trigger functions need no direct grants (invoked by triggers, not client)
-- handle_new_user, update_conversation_timestamp, notify_on_like/comment/reaction/friend_request, 
-- update_updated_at_column, validate_conversation_participants are trigger-only

-- ============================================================
-- 2. Make storage buckets private (files still served via RLS policies)
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id IN (
  'avatars', 'posts', 'stories', 'messages', 'companies', 'documents', 'reels', 'groups'
);
