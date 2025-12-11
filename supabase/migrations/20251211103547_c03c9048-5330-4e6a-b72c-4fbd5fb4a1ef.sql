
-- Create companies table if not exists
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_image TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  commerce_registry TEXT,
  sector TEXT,
  size TEXT,
  founded_year INTEGER,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Companies RLS policies (use IF NOT EXISTS pattern)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Companies are viewable by everyone') THEN
    CREATE POLICY "Companies are viewable by everyone" ON public.companies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can create companies') THEN
    CREATE POLICY "Users can create companies" ON public.companies FOR INSERT WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Company creators can update') THEN
    CREATE POLICY "Company creators can update" ON public.companies FOR UPDATE USING (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Company creators can delete') THEN
    CREATE POLICY "Company creators can delete" ON public.companies FOR DELETE USING (auth.uid() = created_by);
  END IF;
END $$;

-- Create job_posts table if not exists
CREATE TABLE IF NOT EXISTS public.job_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  responsibilities TEXT,
  job_type TEXT NOT NULL DEFAULT 'full-time',
  experience_level TEXT,
  location TEXT,
  remote_option TEXT DEFAULT 'no',
  salary_range TEXT,
  benefits TEXT,
  application_email TEXT,
  application_url TEXT,
  deadline DATE,
  status TEXT DEFAULT 'active',
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_posts' AND policyname = 'Job posts are viewable by everyone') THEN
    CREATE POLICY "Job posts are viewable by everyone" ON public.job_posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_posts' AND policyname = 'Company members can create jobs') THEN
    CREATE POLICY "Company members can create jobs" ON public.job_posts FOR INSERT WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_posts' AND policyname = 'Job creators can update') THEN
    CREATE POLICY "Job creators can update" ON public.job_posts FOR UPDATE USING (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_posts' AND policyname = 'Job creators can delete') THEN
    CREATE POLICY "Job creators can delete" ON public.job_posts FOR DELETE USING (auth.uid() = created_by);
  END IF;
END $$;

-- Create job_applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Users can view their own applications') THEN
    CREATE POLICY "Users can view their own applications" ON public.job_applications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Users can create applications') THEN
    CREATE POLICY "Users can create applications" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications' AND policyname = 'Users can delete their applications') THEN
    CREATE POLICY "Users can delete their applications" ON public.job_applications FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Users can create reports') THEN
    CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Admins can view all reports') THEN
    CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Admins can update reports') THEN
    CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Create certifications table
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  issued_by UUID NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certifications' AND policyname = 'Certifications are viewable by everyone') THEN
    CREATE POLICY "Certifications are viewable by everyone" ON public.certifications FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certifications' AND policyname = 'Admins can manage certifications') THEN
    CREATE POLICY "Admins can manage certifications" ON public.certifications FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_attachments' AND policyname = 'Users can view attachments in their conversations') THEN
    CREATE POLICY "Users can view attachments in their conversations" ON public.message_attachments FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id AND cp.user_id = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_attachments' AND policyname = 'Users can add attachments') THEN
    CREATE POLICY "Users can add attachments" ON public.message_attachments FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM messages m
        WHERE m.id = message_attachments.message_id AND m.sender_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('messages', 'messages', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('companies', 'companies', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies (ignore errors if they already exist)
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload message files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'messages' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Message files are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'messages');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload company files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'companies' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Company files are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'companies');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
