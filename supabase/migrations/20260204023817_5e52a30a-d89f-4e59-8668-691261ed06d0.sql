-- Create story_reactions table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_reactions' AND policyname = 'Anyone can view story reactions') THEN
    CREATE POLICY "Anyone can view story reactions" ON public.story_reactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_reactions' AND policyname = 'Users can add reactions') THEN
    CREATE POLICY "Users can add reactions" ON public.story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_reactions' AND policyname = 'Users can delete their reactions') THEN
    CREATE POLICY "Users can delete their reactions" ON public.story_reactions FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_logs' AND policyname = 'Admins can view logs') THEN
    CREATE POLICY "Admins can view logs" ON public.admin_logs FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_logs' AND policyname = 'Admins can create logs') THEN
    CREATE POLICY "Admins can create logs" ON public.admin_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Create saved_posts table for bookmarks
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_posts' AND policyname = 'Users can view their saved posts') THEN
    CREATE POLICY "Users can view their saved posts" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_posts' AND policyname = 'Users can save posts') THEN
    CREATE POLICY "Users can save posts" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_posts' AND policyname = 'Users can unsave posts') THEN
    CREATE POLICY "Users can unsave posts" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create post_shares table
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  share_type TEXT DEFAULT 'share',
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_shares' AND policyname = 'Anyone can view shares') THEN
    CREATE POLICY "Anyone can view shares" ON public.post_shares FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_shares' AND policyname = 'Users can share posts') THEN
    CREATE POLICY "Users can share posts" ON public.post_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_shares' AND policyname = 'Users can delete their shares') THEN
    CREATE POLICY "Users can delete their shares" ON public.post_shares FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add user_interactions table for AI recommendations
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  interaction_type TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interactions' AND policyname = 'Users can view their interactions') THEN
    CREATE POLICY "Users can view their interactions" ON public.user_interactions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interactions' AND policyname = 'Users can create interactions') THEN
    CREATE POLICY "Users can create interactions" ON public.user_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;