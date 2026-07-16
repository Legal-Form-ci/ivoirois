CREATE TABLE public.geogate_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verdict text NOT NULL CHECK (verdict IN ('ok', 'country', 'vpn', 'fallback')),
  country_code text CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  proxy_signal boolean NOT NULL DEFAULT false,
  vpn_signal boolean NOT NULL DEFAULT false,
  blocked boolean NOT NULL DEFAULT false,
  false_positive_risk text NOT NULL DEFAULT 'none' CHECK (false_positive_risk IN ('none', 'possible', 'likely')),
  route_path text,
  user_agent_family text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.geogate_events TO anon, authenticated;
GRANT SELECT ON public.geogate_events TO authenticated;
GRANT ALL ON public.geogate_events TO service_role;

ALTER TABLE public.geogate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record non-sensitive GeoGate events"
ON public.geogate_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  verdict IN ('ok', 'country', 'vpn', 'fallback')
  AND (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
  AND (route_path IS NULL OR length(route_path) <= 160)
  AND (user_agent_family IS NULL OR user_agent_family IN ('mobile', 'tablet', 'desktop', 'unknown'))
);

CREATE POLICY "Admins can view GeoGate analytics"
ON public.geogate_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

CREATE INDEX idx_geogate_events_created_at ON public.geogate_events(created_at DESC);
CREATE INDEX idx_geogate_events_verdict_country ON public.geogate_events(verdict, country_code, created_at DESC);
CREATE INDEX idx_geogate_events_false_positive ON public.geogate_events(false_positive_risk, created_at DESC) WHERE false_positive_risk <> 'none';

CREATE OR REPLACE FUNCTION public.get_geogate_dashboard(p_since timestamp with time zone DEFAULT now() - interval '7 days')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  WITH filtered AS (
    SELECT *
    FROM public.geogate_events
    WHERE created_at >= p_since
  ), totals AS (
    SELECT
      COUNT(*)::int AS total_checks,
      COUNT(*) FILTER (WHERE blocked)::int AS blocked_checks,
      COUNT(*) FILTER (WHERE verdict = 'vpn')::int AS vpn_blocks,
      COUNT(*) FILTER (WHERE verdict = 'country')::int AS country_blocks,
      COUNT(*) FILTER (WHERE false_positive_risk <> 'none')::int AS false_positive_alerts
    FROM filtered
  ), by_country AS (
    SELECT COALESCE(country_code, '??') AS country, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE blocked)::int AS blocked
    FROM filtered
    GROUP BY COALESCE(country_code, '??')
    ORDER BY COUNT(*) DESC
    LIMIT 16
  ), by_verdict AS (
    SELECT verdict, COUNT(*)::int AS total
    FROM filtered
    GROUP BY verdict
    ORDER BY COUNT(*) DESC
  ), alerts AS (
    SELECT country_code, verdict, false_positive_risk, COUNT(*)::int AS total, MAX(created_at) AS last_seen
    FROM filtered
    WHERE false_positive_risk <> 'none'
    GROUP BY country_code, verdict, false_positive_risk
    ORDER BY COUNT(*) DESC, MAX(created_at) DESC
    LIMIT 12
  ), hourly AS (
    SELECT date_trunc('hour', created_at) AS hour, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE blocked)::int AS blocked
    FROM filtered
    GROUP BY date_trunc('hour', created_at)
    ORDER BY hour DESC
    LIMIT 48
  )
  SELECT jsonb_build_object(
    'totalChecks', COALESCE((SELECT total_checks FROM totals), 0),
    'blockedChecks', COALESCE((SELECT blocked_checks FROM totals), 0),
    'blockRate', CASE WHEN COALESCE((SELECT total_checks FROM totals), 0) = 0 THEN 0 ELSE round(((SELECT blocked_checks FROM totals)::numeric / GREATEST((SELECT total_checks FROM totals), 1)) * 100, 2) END,
    'vpnBlocks', COALESCE((SELECT vpn_blocks FROM totals), 0),
    'countryBlocks', COALESCE((SELECT country_blocks FROM totals), 0),
    'falsePositiveAlerts', COALESCE((SELECT false_positive_alerts FROM totals), 0),
    'byCountry', COALESCE((SELECT jsonb_agg(to_jsonb(by_country)) FROM by_country), '[]'::jsonb),
    'byVerdict', COALESCE((SELECT jsonb_agg(to_jsonb(by_verdict)) FROM by_verdict), '[]'::jsonb),
    'alerts', COALESCE((SELECT jsonb_agg(to_jsonb(alerts)) FROM alerts), '[]'::jsonb),
    'hourly', COALESCE((SELECT jsonb_agg(to_jsonb(hourly)) FROM hourly), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_geogate_dashboard(timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_geogate_dashboard(timestamp with time zone) TO service_role;