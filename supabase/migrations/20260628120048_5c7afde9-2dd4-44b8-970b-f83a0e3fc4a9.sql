-- Messaging read/write repair for read receipts and voice-message signed URLs

DROP POLICY IF EXISTS messages_update_sender ON public.messages;
DROP POLICY IF EXISTS messages_update_participants ON public.messages;
CREATE POLICY messages_update_participants ON public.messages
FOR UPDATE TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS messages_owner_read ON storage.objects;
CREATE POLICY messages_owner_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'messages'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.voice_messages vm
      WHERE vm.audio_url = storage.objects.name
        AND public.can_access_message(vm.message_id, auth.uid())
    )
    OR public.has_role(auth.uid(), 'super_admin')
  )
);
