-- Create groups table if not exists
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups are viewable by everyone" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update" ON public.groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Group creators can delete" ON public.groups FOR DELETE USING (auth.uid() = created_by);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS for group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members are viewable by everyone" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- Create pages table
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  cover_image TEXT,
  profile_image TEXT,
  website TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pages are viewable by everyone" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Users can create pages" ON public.pages FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Page creators can update" ON public.pages FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Page creators can delete" ON public.pages FOR DELETE USING (auth.uid() = created_by);

-- Create page_followers table
CREATE TABLE IF NOT EXISTS public.page_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);

-- Enable RLS for page_followers
ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Page followers viewable by everyone" ON public.page_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow pages" ON public.page_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow pages" ON public.page_followers FOR DELETE USING (auth.uid() = user_id);

-- Create group_messages table for group chat
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for group_messages
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group messages viewable by members" ON public.group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);
CREATE POLICY "Members can send messages" ON public.group_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);