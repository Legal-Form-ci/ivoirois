CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award',
  color text NOT NULL DEFAULT '#D4AF37',
  tier text NOT NULL DEFAULT 'standard',
  is_special boolean NOT NULL DEFAULT false,
  auto_assign boolean NOT NULL DEFAULT false,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.badge_definitions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_definitions TO authenticated;
GRANT ALL ON public.badge_definitions TO service_role;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bd_select ON public.badge_definitions;
CREATE POLICY bd_select ON public.badge_definitions FOR SELECT USING (true);
DROP POLICY IF EXISTS bd_admin_write ON public.badge_definitions;
CREATE POLICY bd_admin_write ON public.badge_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  awarded_by uuid,
  awarded_reason text,
  is_auto boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

GRANT SELECT ON public.user_badges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ub_select ON public.user_badges;
CREATE POLICY ub_select ON public.user_badges FOR SELECT USING (true);
DROP POLICY IF EXISTS ub_admin_write ON public.user_badges;
CREATE POLICY ub_admin_write ON public.user_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.badge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid,
  badge_code text,
  action text NOT NULL,
  actor_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.badge_history TO authenticated;
GRANT ALL ON public.badge_history TO service_role;
ALTER TABLE public.badge_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bh_select ON public.badge_history;
CREATE POLICY bh_select ON public.badge_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS bh_insert ON public.badge_history;
CREATE POLICY bh_insert ON public.badge_history FOR INSERT TO authenticated WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_badge_definitions_updated ON public.badge_definitions;
CREATE TRIGGER trg_badge_definitions_updated BEFORE UPDATE ON public.badge_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_user_badge_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text;
BEGIN
  SELECT code INTO v_code FROM public.badge_definitions WHERE id = COALESCE(NEW.badge_id, OLD.badge_id);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.badge_history(user_id, badge_id, badge_code, action, actor_id, details)
    VALUES (NEW.user_id, NEW.badge_id, v_code, CASE WHEN NEW.is_auto THEN 'auto_granted' ELSE 'granted' END, NEW.awarded_by, jsonb_build_object('reason', NEW.awarded_reason));
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    INSERT INTO public.badge_history(user_id, badge_id, badge_code, action, actor_id, details)
    VALUES (NEW.user_id, NEW.badge_id, v_code, 'revoked', auth.uid(), '{}'::jsonb);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.badge_history(user_id, badge_id, badge_code, action, actor_id, details)
    VALUES (OLD.user_id, OLD.badge_id, v_code, 'removed', auth.uid(), '{}'::jsonb);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_user_badges_history ON public.user_badges;
CREATE TRIGGER trg_user_badges_history AFTER INSERT OR UPDATE OR DELETE ON public.user_badges
FOR EACH ROW EXECUTE FUNCTION public.log_user_badge_change();

INSERT INTO public.badge_definitions (code, name, description, icon, color, tier, is_special, auto_assign, rules, position)
VALUES
 ('founder','Fondateur','Fondateur de E''nvlé Space','crown','#D4AF37','legendary',true,false,'{}'::jsonb,1),
 ('super_admin','Administrateur','Administrateur global de la plateforme','shield','#10B981','elite',false,true,'{"has_role":"super_admin"}'::jsonb,2),
 ('pioneer','Pionnier','Parmi les 1000 premiers membres','rocket','#3B82F6','elite',false,true,'{"joined_before":"2026-12-31"}'::jsonb,3),
 ('creator','Créateur','A publié au moins 20 publications','sparkles','#A855F7','pro',false,true,'{"min_posts":20}'::jsonb,4),
 ('expert','Expert','Profil professionnel complet et actif','briefcase','#F59E0B','pro',false,true,'{"min_posts":50,"profile_complete":true}'::jsonb,5),
 ('mentor','Mentor','Formateur reconnu sur E''nvlé Learning','graduation-cap','#06B6D4','pro',false,true,'{"min_courses":1}'::jsonb,6),
 ('connector','Connecteur','Plus de 50 relations acceptées','users','#EC4899','standard',false,true,'{"min_friends":50}'::jsonb,7),
 ('verified','Vérifié','Identité vérifiée','badge-check','#0EA5E9','standard',false,false,'{}'::jsonb,8)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.run_badge_engine(_user_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b RECORD; u RECORD; granted int := 0; ok boolean;
  v_posts int; v_friends int; v_courses int;
BEGIN
  FOR u IN SELECT id, created_at, full_name, bio, avatar_url, profession, region FROM public.profiles
           WHERE _user_id IS NULL OR id = _user_id LOOP
    SELECT COUNT(*) INTO v_posts FROM public.posts WHERE user_id = u.id;
    SELECT COUNT(*) INTO v_friends FROM public.friendships WHERE status = 'accepted' AND (user_id = u.id OR friend_id = u.id);
    SELECT COUNT(*) INTO v_courses FROM public.courses WHERE instructor_id = u.id;

    FOR b IN SELECT * FROM public.badge_definitions WHERE active AND auto_assign LOOP
      ok := true;
      IF b.rules ? 'min_posts' AND v_posts < (b.rules->>'min_posts')::int THEN ok := false; END IF;
      IF b.rules ? 'min_friends' AND v_friends < (b.rules->>'min_friends')::int THEN ok := false; END IF;
      IF b.rules ? 'min_courses' AND v_courses < (b.rules->>'min_courses')::int THEN ok := false; END IF;
      IF b.rules ? 'joined_before' AND u.created_at >= (b.rules->>'joined_before')::timestamptz THEN ok := false; END IF;
      IF b.rules ? 'has_role' AND NOT public.has_role(u.id, (b.rules->>'has_role')::app_role) THEN ok := false; END IF;
      IF b.rules ? 'profile_complete' AND (b.rules->>'profile_complete')::boolean THEN
        IF COALESCE(u.bio,'') = '' OR COALESCE(u.avatar_url,'') = '' OR COALESCE(u.profession,'') = '' THEN ok := false; END IF;
      END IF;

      IF ok THEN
        INSERT INTO public.user_badges (user_id, badge_id, is_auto, awarded_reason)
        VALUES (u.id, b.id, true, 'Attribution automatique')
        ON CONFLICT (user_id, badge_id) DO NOTHING;
        IF FOUND THEN granted := granted + 1; END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN granted;
END; $$;

REVOKE ALL ON FUNCTION public.run_badge_engine(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_badge_engine(uuid) TO authenticated;

INSERT INTO public.user_badges (user_id, badge_id, is_auto, awarded_reason)
SELECT p.id, b.id, false, 'Fondateur de la plateforme'
FROM public.profiles p, public.badge_definitions b
WHERE b.code = 'founder' AND p.full_name ILIKE '%KOFFI%'
ORDER BY p.created_at ASC
LIMIT 1
ON CONFLICT DO NOTHING;

SELECT public.run_badge_engine(NULL);