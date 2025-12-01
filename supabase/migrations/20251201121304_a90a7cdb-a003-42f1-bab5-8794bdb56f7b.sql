-- Create reactions table for posts
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'smile', 'wow', 'sad', 'cry', 'angry', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reactions
CREATE POLICY "Reactions are viewable by everyone" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Users can create reactions" ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reactions" ON public.reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions" ON public.reactions FOR DELETE USING (auth.uid() = user_id);