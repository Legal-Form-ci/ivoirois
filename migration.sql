-- 1. Realtime Expansion
ALTER PUBLICATION supabase_realtime ADD TABLE groups, group_members, group_messages, voice_messages, friendships;

-- 2. Ensure Profile Triggers (Fixing FK host_id and similar errors)
-- Helper to add trigger to multiple tables
DO $$
DECLARE
    t text;
    cols text[] := ARRAY['user_id', 'sender_id', 'created_by', 'host_id', 'author_id'];
    c text;
BEGIN
    FOR t, c IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = ANY(cols)
          AND table_name NOT IN ('profiles', 'user_roles') -- Avoid self-reference or roles
    LOOP
        -- Check if trigger already exists
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_profile_before_' || t || '_write') THEN
            EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %I ON %I FOR EACH ROW EXECUTE FUNCTION ensure_profile_trigger(%L)', 
                'ensure_profile_before_' || t || '_write', c, t, c);
        END IF;
    END LOOP;
END $$;

-- 3. Storage Policies for Replays and Voice Messages
-- Replays (recordings bucket)
CREATE POLICY "recordings_read_all" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'recordings');

-- Voice Messages / Messages bucket access improvement
-- Allow participants to read files in messages bucket regardless of path structure if they can access the message metadata
CREATE OR REPLACE FUNCTION storage.can_access_message_file(object_name text)
RETURNS boolean AS $$
DECLARE
    msg_id uuid;
BEGIN
    -- Try to extract UUID from path
    BEGIN
        msg_id := (split_part(object_name, '/', 1))::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;
    
    RETURN EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
        WHERE m.id = msg_id AND cp.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a more flexible policy for messages bucket
-- This assumes path is messageId/filename
CREATE POLICY "messages_participant_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'messages' AND storage.can_access_message_file(name));

-- 4. Voice Messages RLS fix
-- Ensure voice messages are readable if the user can see the message
DROP POLICY IF EXISTS "vm_select" ON voice_messages;
CREATE POLICY "vm_select" ON voice_messages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM messages m
        JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        WHERE m.id = voice_messages.message_id AND cp.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "vm_insert" ON voice_messages;
CREATE POLICY "vm_insert" ON voice_messages
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM messages m
        JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        WHERE m.id = message_id AND cp.user_id = auth.uid()
    )
);

-- 5. Groups Realtime and RLS cleanup
-- (Realtime added in step 1)
-- Ensure groups are readable by all authenticated
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups
FOR SELECT TO authenticated
USING (true);

-- 6. Projects RLS
-- Ensure projects are readable by all authenticated
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects
FOR SELECT TO authenticated
USING (true);

-- 7. Companies RLS
-- Ensure companies are readable by all authenticated
DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies
FOR SELECT TO authenticated
USING (true);

