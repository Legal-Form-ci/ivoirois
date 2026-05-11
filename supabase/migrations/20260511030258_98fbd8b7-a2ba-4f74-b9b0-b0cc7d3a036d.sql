
-- Re-attach the new-user trigger so a profile is created for every signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, username, full_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), u.id::text),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Utilisateur')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
