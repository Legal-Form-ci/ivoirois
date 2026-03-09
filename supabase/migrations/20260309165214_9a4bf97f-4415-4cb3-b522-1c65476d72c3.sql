-- Fix admin_logs: drop existing al_insert then recreate
DROP POLICY IF EXISTS "al_manage" ON public.admin_logs;
DROP POLICY IF EXISTS "al_select" ON public.admin_logs;
DROP POLICY IF EXISTS "al_insert" ON public.admin_logs;
CREATE POLICY "al_select" ON public.admin_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "al_insert" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));