-- Privacy and CRUD hardening for conversations, voice messages, calls, live/replay

-- 1) Per-user private conversation settings
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS ephemeral_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ephemeral_ttl_seconds integer NOT NULL DEFAULT 86400;

-- 2) Ephemeral messages support
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 3) Voice message processing state for clean previews/transcriptions
ALTER TABLE public.voice_messages
  ADD COLUMN IF NOT EXISTS transcription_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS transcription_error text;

-- 4) WebRTC call metadata for quality/rating and clean controls
ALTER TABLE public.call_signals
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes');

CREATE TABLE IF NOT EXISTS public.call_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  rated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_user uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, rated_by, created_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_ratings TO authenticated;
GRANT ALL ON public.call_ratings TO service_role;
ALTER TABLE public.call_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_ratings_read_participants ON public.call_ratings;
CREATE POLICY call_ratings_read_participants ON public.call_ratings
FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS call_ratings_create_self ON public.call_ratings;
CREATE POLICY call_ratings_create_self ON public.call_ratings
FOR INSERT TO authenticated
WITH CHECK (rated_by = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS call_ratings_update_self ON public.call_ratings;
CREATE POLICY call_ratings_update_self ON public.call_ratings
FOR UPDATE TO authenticated
USING (rated_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (rated_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS call_ratings_delete_self ON public.call_ratings;
CREATE POLICY call_ratings_delete_self ON public.call_ratings
FOR DELETE TO authenticated
USING (rated_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 5) Expire new messages automatically if any participant enabled ephemeral mode
CREATE OR REPLACE FUNCTION public.apply_ephemeral_message_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ttl integer;
BEGIN
  SELECT MIN(ephemeral_ttl_seconds)
    INTO ttl
  FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND ephemeral_enabled = true;

  IF ttl IS NOT NULL THEN
    NEW.expires_at := now() + make_interval(secs => GREATEST(ttl, 60));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_ephemeral_message_expiry_trigger ON public.messages;
CREATE TRIGGER apply_ephemeral_message_expiry_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.apply_ephemeral_message_expiry();

-- Trigger-only function must not be callable from client roles
REVOKE EXECUTE ON FUNCTION public.apply_ephemeral_message_expiry() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_ephemeral_message_expiry() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_ephemeral_message_expiry() FROM authenticated;

-- 6) Normalize permissions grants for touched public tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_messages TO authenticated;
GRANT ALL ON public.voice_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_signals TO authenticated;
GRANT ALL ON public.call_signals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT SELECT ON public.live_streams TO anon;
GRANT ALL ON public.live_streams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_stream_comments TO authenticated;
GRANT SELECT ON public.live_stream_comments TO anon;
GRANT ALL ON public.live_stream_comments TO service_role;

-- 7) Consolidated RLS rules for conversations/messages/voice/calls
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_comments ENABLE ROW LEVEL SECURITY;

-- Conversations
DROP POLICY IF EXISTS conversations_read_participant ON public.conversations;
CREATE POLICY conversations_read_participant ON public.conversations
FOR SELECT TO authenticated
USING (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS conversations_create_auth ON public.conversations;
CREATE POLICY conversations_create_auth ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS conversations_update_participant ON public.conversations;
CREATE POLICY conversations_update_participant ON public.conversations
FOR UPDATE TO authenticated
USING (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS conversations_delete_participant ON public.conversations;
CREATE POLICY conversations_delete_participant ON public.conversations
FOR DELETE TO authenticated
USING (public.is_conversation_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Conversation participants
DROP POLICY IF EXISTS conversation_participants_read ON public.conversation_participants;
CREATE POLICY conversation_participants_read ON public.conversation_participants
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS conversation_participants_create ON public.conversation_participants;
CREATE POLICY conversation_participants_create ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS conversation_participants_update_self ON public.conversation_participants;
CREATE POLICY conversation_participants_update_self ON public.conversation_participants
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS conversation_participants_delete_self ON public.conversation_participants;
CREATE POLICY conversation_participants_delete_self ON public.conversation_participants
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Messages
DROP POLICY IF EXISTS messages_read_participants ON public.messages;
CREATE POLICY messages_read_participants ON public.messages
FOR SELECT TO authenticated
USING ((public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) AND (expires_at IS NULL OR expires_at > now() OR sender_id = auth.uid()));

DROP POLICY IF EXISTS messages_create_participant ON public.messages;
CREATE POLICY messages_create_participant ON public.messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS messages_update_sender_or_participant_read ON public.messages;
CREATE POLICY messages_update_sender_or_participant_read ON public.messages
FOR UPDATE TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS messages_delete_sender ON public.messages;
CREATE POLICY messages_delete_sender ON public.messages
FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Voice messages
DROP POLICY IF EXISTS voice_messages_read_participants ON public.voice_messages;
CREATE POLICY voice_messages_read_participants ON public.voice_messages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.id = voice_messages.message_id
    AND (public.is_conversation_participant(m.conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (m.expires_at IS NULL OR m.expires_at > now() OR m.sender_id = auth.uid())
));

DROP POLICY IF EXISTS voice_messages_create_sender ON public.voice_messages;
CREATE POLICY voice_messages_create_sender ON public.voice_messages
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.id = voice_messages.message_id
    AND m.sender_id = auth.uid()
    AND public.is_conversation_participant(m.conversation_id, auth.uid())
));

DROP POLICY IF EXISTS voice_messages_update_sender ON public.voice_messages;
CREATE POLICY voice_messages_update_sender ON public.voice_messages
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = voice_messages.message_id AND (m.sender_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = voice_messages.message_id AND (m.sender_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))));

DROP POLICY IF EXISTS voice_messages_delete_sender ON public.voice_messages;
CREATE POLICY voice_messages_delete_sender ON public.voice_messages
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = voice_messages.message_id AND (m.sender_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))));

-- Call signals: only conversation participants and direct caller/callee can exchange signals
DROP POLICY IF EXISTS call_signals_read_private ON public.call_signals;
CREATE POLICY call_signals_read_private ON public.call_signals
FOR SELECT TO authenticated
USING ((auth.uid() = caller_id OR auth.uid() = callee_id OR (conversation_id IS NOT NULL AND public.is_conversation_participant(conversation_id, auth.uid()))) AND expires_at > now());

DROP POLICY IF EXISTS call_signals_create_private ON public.call_signals;
CREATE POLICY call_signals_create_private ON public.call_signals
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id AND (conversation_id IS NULL OR public.is_conversation_participant(conversation_id, auth.uid())));

DROP POLICY IF EXISTS call_signals_delete_private ON public.call_signals;
CREATE POLICY call_signals_delete_private ON public.call_signals
FOR DELETE TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = callee_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Live streams/replay CRUD
DROP POLICY IF EXISTS live_streams_read_visible ON public.live_streams;
CREATE POLICY live_streams_read_visible ON public.live_streams
FOR SELECT TO anon, authenticated
USING (COALESCE(privacy, 'public') = 'public' OR host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS live_streams_create_owner ON public.live_streams;
CREATE POLICY live_streams_create_owner ON public.live_streams
FOR INSERT TO authenticated
WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS live_streams_update_owner ON public.live_streams;
CREATE POLICY live_streams_update_owner ON public.live_streams
FOR UPDATE TO authenticated
USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS live_streams_delete_owner ON public.live_streams;
CREATE POLICY live_streams_delete_owner ON public.live_streams
FOR DELETE TO authenticated
USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Live comments
DROP POLICY IF EXISTS live_comments_read_visible_stream ON public.live_stream_comments;
CREATE POLICY live_comments_read_visible_stream ON public.live_stream_comments
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.live_streams ls WHERE ls.id = live_stream_comments.stream_id AND (COALESCE(ls.privacy, 'public') = 'public' OR ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))));

DROP POLICY IF EXISTS live_comments_create_visible_stream ON public.live_stream_comments;
CREATE POLICY live_comments_create_visible_stream ON public.live_stream_comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.live_streams ls WHERE ls.id = live_stream_comments.stream_id AND (COALESCE(ls.privacy, 'public') = 'public' OR ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))));

DROP POLICY IF EXISTS live_comments_update_owner ON public.live_stream_comments;
CREATE POLICY live_comments_update_owner ON public.live_stream_comments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS live_comments_delete_owner_host ON public.live_stream_comments;
CREATE POLICY live_comments_delete_owner_host ON public.live_stream_comments
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR EXISTS (SELECT 1 FROM public.live_streams ls WHERE ls.id = live_stream_comments.stream_id AND ls.host_id = auth.uid()));

-- 8) Private storage: only conversation participants can read voice-message files by matching voice_messages.audio_url
DROP POLICY IF EXISTS messages_bucket_read_conversation_participants ON storage.objects;
CREATE POLICY messages_bucket_read_conversation_participants ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'messages'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.voice_messages vm
      JOIN public.messages m ON m.id = vm.message_id
      WHERE vm.audio_url = storage.objects.name
        AND public.is_conversation_participant(m.conversation_id, auth.uid())
        AND (m.expires_at IS NULL OR m.expires_at > now() OR m.sender_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS messages_bucket_write_owner_folder ON storage.objects;
CREATE POLICY messages_bucket_write_owner_folder ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'messages' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS messages_bucket_update_owner_folder ON storage.objects;
CREATE POLICY messages_bucket_update_owner_folder ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'messages' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'messages' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS messages_bucket_delete_owner_folder ON storage.objects;
CREATE POLICY messages_bucket_delete_owner_folder ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'messages' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Recordings bucket: live host can manage its stream folder; public/private visibility follows live stream visibility through signed URL generation.
DROP POLICY IF EXISTS recordings_bucket_read_visible_stream ON storage.objects;
CREATE POLICY recordings_bucket_read_visible_stream ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(storage.objects.name, '/', 1)
      AND (COALESCE(ls.privacy, 'public') = 'public' OR ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  )
);

DROP POLICY IF EXISTS recordings_bucket_write_host ON storage.objects;
CREATE POLICY recordings_bucket_write_host ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(storage.objects.name, '/', 1)
      AND ls.host_id = auth.uid()
  )
);

DROP POLICY IF EXISTS recordings_bucket_update_host ON storage.objects;
CREATE POLICY recordings_bucket_update_host ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (SELECT 1 FROM public.live_streams ls WHERE ls.id::text = split_part(storage.objects.name, '/', 1) AND ls.host_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'recordings'
  AND EXISTS (SELECT 1 FROM public.live_streams ls WHERE ls.id::text = split_part(storage.objects.name, '/', 1) AND ls.host_id = auth.uid())
);

DROP POLICY IF EXISTS recordings_bucket_delete_host ON storage.objects;
CREATE POLICY recordings_bucket_delete_host ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (SELECT 1 FROM public.live_streams ls WHERE ls.id::text = split_part(storage.objects.name, '/', 1) AND (ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_expires ON public.messages(conversation_id, created_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_voice_messages_message_id ON public.voice_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_conversation_expires ON public.call_signals(conversation_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_live_streams_status_created ON public.live_streams(status, created_at DESC);
