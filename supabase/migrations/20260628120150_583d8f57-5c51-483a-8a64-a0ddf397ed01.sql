-- Realtime activation for missing interactive modules
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['groups','group_members','group_messages','voice_messages','friendships']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t)
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = t
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Broader profile guard for user-related writes
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('user_id','sender_id','created_by','host_id','seller_id','reporter_id','from_user_id')
      AND table_name NOT IN ('profiles','user_roles')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS ensure_profile_before_%I_%I_write ON public.%I', item.table_name, item.column_name, item.table_name);
    EXECUTE format('CREATE TRIGGER ensure_profile_before_%I_%I_write BEFORE INSERT OR UPDATE OF %I ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_trigger(%L)', item.table_name, item.column_name, item.column_name, item.table_name, item.column_name);
  END LOOP;
END $$;
