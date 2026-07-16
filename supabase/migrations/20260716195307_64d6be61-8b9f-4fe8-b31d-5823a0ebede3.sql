REVOKE EXECUTE ON FUNCTION public.get_geogate_dashboard(timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_geogate_dashboard(timestamp with time zone) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_geogate_dashboard(timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_geogate_dashboard(timestamp with time zone) TO service_role;