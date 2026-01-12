-- Définir admin@ivoirois.ci comme super_admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('cb4b9dc8-2390-4569-97ef-b339bf2db2d3', 'super_admin') 
ON CONFLICT (user_id, role) DO NOTHING;