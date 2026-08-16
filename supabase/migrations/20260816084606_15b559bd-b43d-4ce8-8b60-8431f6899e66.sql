-- 1. Founder partner badge
INSERT INTO public.badge_definitions (code, name, description, icon, color, tier, is_special, auto_assign, rules, position, active)
VALUES ('partenaire_fondateur', 'Partenaire Fondateur', 'Membre des débuts d''E''nvlé Space (inscrit avant le 31 décembre 2026)', 'crown', '#D4AF37', 'gold', true, true, '{"joined_before":"2026-12-31T23:59:59Z"}'::jsonb, 1, true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, color = EXCLUDED.color, tier = EXCLUDED.tier, is_special = true, auto_assign = true, rules = EXCLUDED.rules, active = true;

INSERT INTO public.user_badges (user_id, badge_id, awarded_reason, is_auto)
SELECT p.id, b.id, 'Inscription avant le 31 décembre 2026', true
FROM public.profiles p CROSS JOIN public.badge_definitions b
WHERE b.code = 'partenaire_fondateur'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.award_founder_partner_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_badge uuid;
BEGIN
  IF now() <= timestamptz '2026-12-31 23:59:59+00' THEN
    SELECT id INTO v_badge FROM public.badge_definitions WHERE code = 'partenaire_fondateur';
    IF v_badge IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, awarded_reason, is_auto)
      VALUES (NEW.id, v_badge, 'Inscription avant le 31 décembre 2026', true)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_founder_partner_badge ON public.profiles;
CREATE TRIGGER trg_award_founder_partner_badge
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.award_founder_partner_badge();

-- 2. Live viewers
CREATE TABLE IF NOT EXISTS public.live_stream_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  UNIQUE (stream_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_stream_viewers TO authenticated;
GRANT ALL ON public.live_stream_viewers TO service_role;
ALTER TABLE public.live_stream_viewers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "viewers_select" ON public.live_stream_viewers;
CREATE POLICY "viewers_select" ON public.live_stream_viewers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "viewers_manage_own" ON public.live_stream_viewers;
CREATE POLICY "viewers_manage_own" ON public.live_stream_viewers FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Live reactions
CREATE TABLE IF NOT EXISTS public.live_stream_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.live_stream_reactions TO authenticated;
GRANT ALL ON public.live_stream_reactions TO service_role;
ALTER TABLE public.live_stream_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "live_reactions_select" ON public.live_stream_reactions;
CREATE POLICY "live_reactions_select" ON public.live_stream_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "live_reactions_insert" ON public.live_stream_reactions;
CREATE POLICY "live_reactions_insert" ON public.live_stream_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "live_reactions_delete" ON public.live_stream_reactions;
CREATE POLICY "live_reactions_delete" ON public.live_stream_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. Call history
CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type text NOT NULL DEFAULT 'audio',
  status text NOT NULL DEFAULT 'ringing',
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.call_history TO authenticated;
GRANT ALL ON public.call_history TO service_role;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "call_history_select" ON public.call_history;
CREATE POLICY "call_history_select" ON public.call_history FOR SELECT TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid());
DROP POLICY IF EXISTS "call_history_insert" ON public.call_history;
CREATE POLICY "call_history_insert" ON public.call_history FOR INSERT TO authenticated WITH CHECK (caller_id = auth.uid() OR callee_id = auth.uid());
DROP POLICY IF EXISTS "call_history_update" ON public.call_history;
CREATE POLICY "call_history_update" ON public.call_history FOR UPDATE TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid()) WITH CHECK (caller_id = auth.uid() OR callee_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_call_history_parties ON public.call_history (caller_id, callee_id, created_at DESC);

-- 5. Users can read their own roles
DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;
CREATE POLICY "users_read_own_roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));