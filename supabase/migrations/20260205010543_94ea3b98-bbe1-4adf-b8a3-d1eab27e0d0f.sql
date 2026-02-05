-- Security hardening: restrict public data exposure + fix recursive RLS

-- 1) Helper functions (SECURITY DEFINER) to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conversation_id
      AND cp.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_message(_message_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversation_participants cp
      ON cp.conversation_id = m.conversation_id
    WHERE m.id = _message_id
      AND cp.user_id = _user_id
  );
$$;

-- 2) PROFILES: remove public internet access (still readable when signed in)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Ensure self insert/update remain (keep existing policies if present)
-- (No change to existing INSERT/UPDATE policies created earlier)

-- 3) COMPANIES: remove public internet access
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
CREATE POLICY "Companies viewable by authenticated"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- 4) NOTIFICATIONS: prevent fake notifications (no open INSERT)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Only super admins can insert notifications directly (optional admin tooling)
CREATE POLICY "Only super admins can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Ensure users can still read/update their own notifications (tighten to authenticated)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 5) CONVERSATIONS: fix recursion + tighten to authenticated
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(id, auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  public.is_conversation_participant(id, auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- 6) CONVERSATION PARTICIPANTS: replace recursive policies
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(conversation_id, auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Users can add participants to conversations"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  OR public.is_conversation_participant(conversation_id, auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- Keep update policy but tighten role
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.conversation_participants;
CREATE POLICY "Users can update their own participant record"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 7) VOICE MESSAGES: restrict access to conversation participants
DROP POLICY IF EXISTS "Users can view voice messages in their conversations" ON public.voice_messages;
CREATE POLICY "Users can view voice messages in their conversations"
ON public.voice_messages
FOR SELECT
TO authenticated
USING (
  public.can_access_message(message_id, auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "Users can create voice messages" ON public.voice_messages;
CREATE POLICY "Users can create voice messages"
ON public.voice_messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_message(message_id, auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- 8) JOB APPLICATIONS: allow employers (job post creators) to view applications
DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications;
CREATE POLICY "Users can view their own applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Employers can view applications for their jobs"
ON public.job_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.job_posts jp
    WHERE jp.id = job_applications.job_id
      AND jp.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- Tighten INSERT/DELETE to authenticated (recreate policies)
DROP POLICY IF EXISTS "Users can create applications" ON public.job_applications;
CREATE POLICY "Users can create applications"
ON public.job_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their applications" ON public.job_applications;
CREATE POLICY "Users can delete their applications"
ON public.job_applications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
