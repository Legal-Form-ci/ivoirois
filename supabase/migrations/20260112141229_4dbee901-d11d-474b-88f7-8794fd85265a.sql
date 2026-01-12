-- ============================================================
-- COMPLETE DATABASE OPTIMIZATION AND SECURITY MIGRATION
-- Ivoi'Rois Platform - Production Ready Database
-- ============================================================

-- ============================================================
-- 1. PERFORMANCE INDEXES
-- ============================================================

-- Posts indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON public.posts(is_scheduled, scheduled_at) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON public.posts USING GIN(hashtags);

-- Messages indexes for real-time messaging
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, read) WHERE read = false;

-- Profiles indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles USING GIN(to_tsvector('french', full_name));
CREATE INDEX IF NOT EXISTS idx_profiles_region ON public.profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_sector ON public.profiles(sector);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON public.profiles(is_online) WHERE is_online = true;

-- Friendships indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);
CREATE INDEX IF NOT EXISTS idx_companies_region ON public.companies(region);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON public.companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_verified ON public.companies(verified) WHERE verified = true;

-- Job posts indexes
CREATE INDEX IF NOT EXISTS idx_job_posts_company_id ON public.job_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON public.job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_location ON public.job_posts(location);
CREATE INDEX IF NOT EXISTS idx_job_posts_created_at ON public.job_posts(created_at DESC);

-- Groups and members indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_privacy ON public.groups(privacy);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Reels indexes
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON public.reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_public ON public.reels(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_reels_hashtags ON public.reels USING GIN(hashtags);

-- Scheduled content indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON public.scheduled_messages(status, scheduled_at);

-- User interactions and recommendations
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_content ON public.user_interactions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_user_id ON public.content_recommendations(user_id);

-- ============================================================
-- 2. DATABASE FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================

-- Function to get user's friends with online status
CREATE OR REPLACE FUNCTION public.get_friends_with_status(p_user_id uuid)
RETURNS TABLE (
  friend_id uuid,
  full_name text,
  username text,
  avatar_url text,
  is_online boolean,
  last_seen timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as friend_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.is_online,
    p.last_seen
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.user_id = p_user_id THEN f.friend_id = p.id
      ELSE f.user_id = p.id
    END
  )
  WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
    AND f.status = 'accepted'
  ORDER BY p.is_online DESC, p.last_seen DESC NULLS LAST;
$$;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM messages m
  JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.read = false;
$$;

-- Function to get personalized feed
CREATE OR REPLACE FUNCTION public.get_personalized_feed(p_user_id uuid, p_limit int DEFAULT 50)
RETURNS TABLE (
  post_id uuid,
  content text,
  title text,
  hook text,
  media_urls text[],
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_avatar text,
  likes_count bigint,
  comments_count bigint,
  relevance_score float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_region text;
  v_user_interests text[];
BEGIN
  -- Get user's profile info
  SELECT region, interests INTO v_user_region, v_user_interests
  FROM profiles WHERE id = p_user_id;

  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.content,
    p.title,
    p.hook,
    p.media_urls,
    p.created_at,
    p.user_id as author_id,
    pr.full_name as author_name,
    pr.avatar_url as author_avatar,
    COALESCE(l.count, 0) as likes_count,
    COALESCE(c.count, 0) as comments_count,
    -- Calculate relevance score
    (
      CASE WHEN pr.region = v_user_region THEN 2.0 ELSE 0 END +
      CASE WHEN EXISTS (
        SELECT 1 FROM friendships f 
        WHERE f.status = 'accepted' 
        AND ((f.user_id = p_user_id AND f.friend_id = p.user_id) 
             OR (f.friend_id = p_user_id AND f.user_id = p.user_id))
      ) THEN 3.0 ELSE 0 END +
      -- Recency bonus (newer = higher)
      GREATEST(0, 10 - EXTRACT(HOUR FROM now() - p.created_at)::float / 24)
    )::float as relevance_score
  FROM posts p
  JOIN profiles pr ON p.user_id = pr.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count FROM likes WHERE post_id = p.id
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count FROM comments WHERE post_id = p.id
  ) c ON true
  WHERE p.is_scheduled IS NOT TRUE OR p.is_scheduled IS NULL
  ORDER BY relevance_score DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to search content
CREATE OR REPLACE FUNCTION public.search_content(
  p_query text,
  p_type text DEFAULT 'all'
)
RETURNS TABLE (
  result_type text,
  result_id uuid,
  title text,
  description text,
  image_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Search profiles
  SELECT 
    'profile'::text as result_type,
    p.id as result_id,
    p.full_name as title,
    p.bio as description,
    p.avatar_url as image_url,
    p.created_at
  FROM profiles p
  WHERE (p_type = 'all' OR p_type = 'profile')
    AND (p.full_name ILIKE '%' || p_query || '%' OR p.username ILIKE '%' || p_query || '%')
  
  UNION ALL
  
  -- Search posts
  SELECT 
    'post'::text as result_type,
    po.id as result_id,
    po.title,
    LEFT(po.content, 200) as description,
    po.image_url,
    po.created_at
  FROM posts po
  WHERE (p_type = 'all' OR p_type = 'post')
    AND (po.content ILIKE '%' || p_query || '%' OR po.title ILIKE '%' || p_query || '%')
  
  UNION ALL
  
  -- Search companies
  SELECT 
    'company'::text as result_type,
    c.id as result_id,
    c.name as title,
    c.description,
    c.logo_url as image_url,
    c.created_at
  FROM companies c
  WHERE (p_type = 'all' OR p_type = 'company')
    AND (c.name ILIKE '%' || p_query || '%' OR c.description ILIKE '%' || p_query || '%')
  
  UNION ALL
  
  -- Search jobs
  SELECT 
    'job'::text as result_type,
    j.id as result_id,
    j.title,
    LEFT(j.description, 200) as description,
    NULL::text as image_url,
    j.created_at
  FROM job_posts j
  WHERE (p_type = 'all' OR p_type = 'job')
    AND j.status = 'active'
    AND (j.title ILIKE '%' || p_query || '%' OR j.description ILIKE '%' || p_query || '%')
  
  ORDER BY created_at DESC
  LIMIT 50;
END;
$$;

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE (
  total_users bigint,
  total_posts bigint,
  total_companies bigint,
  total_jobs bigint,
  active_users_today bigint,
  posts_today bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM posts) as total_posts,
    (SELECT COUNT(*) FROM companies) as total_companies,
    (SELECT COUNT(*) FROM job_posts WHERE status = 'active') as total_jobs,
    (SELECT COUNT(*) FROM profiles WHERE is_online = true OR last_seen > now() - interval '24 hours') as active_users_today,
    (SELECT COUNT(*) FROM posts WHERE created_at > now() - interval '24 hours') as posts_today;
$$;

-- Function to record user interaction for recommendations
CREATE OR REPLACE FUNCTION public.record_interaction(
  p_user_id uuid,
  p_content_type text,
  p_content_id uuid,
  p_interaction_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight numeric;
BEGIN
  -- Determine interaction weight
  v_weight := CASE p_interaction_type
    WHEN 'view' THEN 1.0
    WHEN 'like' THEN 2.0
    WHEN 'comment' THEN 3.0
    WHEN 'share' THEN 4.0
    WHEN 'save' THEN 5.0
    ELSE 1.0
  END;

  INSERT INTO user_interactions (user_id, content_type, content_id, interaction_type, weight)
  VALUES (p_user_id, p_content_type, p_content_id, p_interaction_type, v_weight)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================================
-- 3. ADMIN MEDIA MANAGEMENT TABLE
-- ============================================================

-- Create admin media table for managing site content
CREATE TABLE IF NOT EXISTS public.admin_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  section_name text NOT NULL,
  media_urls text[] DEFAULT '{}',
  media_types text[] DEFAULT '{}',
  description text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_media ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_media
CREATE POLICY "Admin media viewable by everyone"
  ON public.admin_media FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage media"
  ON public.admin_media FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default sections
INSERT INTO public.admin_media (section_key, section_name, description) VALUES
  ('hero_home', 'Image Hero Accueil', 'Image principale de la page d''accueil'),
  ('nursery', 'Pépinière', 'Images de la section pépinière'),
  ('about', 'À propos', 'Images de la section à propos'),
  ('features', 'Fonctionnalités', 'Images des fonctionnalités'),
  ('testimonials', 'Témoignages', 'Photos des témoignages')
ON CONFLICT (section_key) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_admin_media_updated_at
  BEFORE UPDATE ON public.admin_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. TRANSLATIONS TABLE FOR i18n
-- ============================================================

CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  language_code text NOT NULL,
  value text NOT NULL,
  context text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key, language_code)
);

-- Enable RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- RLS policies for translations
CREATE POLICY "Translations viewable by everyone"
  ON public.translations FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage translations"
  ON public.translations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_translations_key_lang ON public.translations(key, language_code);
CREATE INDEX IF NOT EXISTS idx_translations_language ON public.translations(language_code);

-- Function to get translation
CREATE OR REPLACE FUNCTION public.get_translation(p_key text, p_lang text DEFAULT 'fr')
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value FROM translations WHERE key = p_key AND language_code = p_lang),
    (SELECT value FROM translations WHERE key = p_key AND language_code = 'fr'),
    p_key
  );
$$;

-- Trigger for updated_at
CREATE TRIGGER update_translations_updated_at
  BEFORE UPDATE ON public.translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();