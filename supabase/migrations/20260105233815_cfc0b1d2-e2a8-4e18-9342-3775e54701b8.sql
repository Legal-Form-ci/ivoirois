-- Create resumes table for CV management
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  skills TEXT[] DEFAULT '{}',
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  languages JSONB DEFAULT '[]',
  projects JSONB DEFAULT '[]',
  interests TEXT[] DEFAULT '{}',
  user_references TEXT,
  is_public BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Users can view their own resumes
CREATE POLICY "Users can view their own resumes"
ON public.resumes
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone can view public resumes
CREATE POLICY "Anyone can view public resumes"
ON public.resumes
FOR SELECT
USING (is_public = true);

-- Users can create their own resumes
CREATE POLICY "Users can create their own resumes"
ON public.resumes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own resumes
CREATE POLICY "Users can update their own resumes"
ON public.resumes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own resumes
CREATE POLICY "Users can delete their own resumes"
ON public.resumes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_resumes_updated_at
BEFORE UPDATE ON public.resumes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();