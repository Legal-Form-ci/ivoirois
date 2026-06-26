CREATE OR REPLACE FUNCTION public.resolve_login_identifier(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, auth
AS $$
  SELECT u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(p.username) = lower(trim(_identifier))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_login_identifier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated;