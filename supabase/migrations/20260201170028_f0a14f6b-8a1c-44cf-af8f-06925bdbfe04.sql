-- Create events table (like Facebook Events)
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  location TEXT,
  location_type TEXT DEFAULT 'in_person', -- in_person, online, hybrid
  event_url TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'Africa/Abidjan',
  category TEXT,
  privacy TEXT DEFAULT 'public', -- public, private
  max_attendees INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event attendees
CREATE TABLE public.event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going', -- going, interested, not_going
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Marketplace listings
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  category TEXT NOT NULL,
  condition TEXT DEFAULT 'new', -- new, like_new, good, fair
  location TEXT,
  region TEXT,
  images TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active', -- active, sold, reserved, deleted
  views_count INTEGER DEFAULT 0,
  is_negotiable BOOLEAN DEFAULT true,
  delivery_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Marketplace favorites
CREATE TABLE public.marketplace_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

-- Polls system (like Twitter polls)
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_multiple_choice BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_id)
);

-- Live streams (like Instagram/Facebook Live)
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  stream_key TEXT UNIQUE,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, ended
  privacy TEXT DEFAULT 'public',
  viewers_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Live stream comments
CREATE TABLE public.live_stream_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Post mentions (for @mentions)
CREATE TABLE public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Post templates
CREATE TABLE public.post_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (privacy = 'public' OR auth.uid() = created_by);
CREATE POLICY "Users can create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Event creators can update" ON public.events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Event creators can delete" ON public.events FOR DELETE USING (auth.uid() = created_by);

-- RLS for event attendees
CREATE POLICY "Event attendees viewable by everyone" ON public.event_attendees FOR SELECT USING (true);
CREATE POLICY "Users can RSVP" ON public.event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their RSVP" ON public.event_attendees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their RSVP" ON public.event_attendees FOR DELETE USING (auth.uid() = user_id);

-- RLS for marketplace
CREATE POLICY "Active listings are viewable" ON public.marketplace_listings FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "Users can create listings" ON public.marketplace_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update listings" ON public.marketplace_listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete listings" ON public.marketplace_listings FOR DELETE USING (auth.uid() = seller_id);

-- RLS for marketplace favorites
CREATE POLICY "Users can view their favorites" ON public.marketplace_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.marketplace_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.marketplace_favorites FOR DELETE USING (auth.uid() = user_id);

-- RLS for polls
CREATE POLICY "Polls are viewable by everyone" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls" ON public.polls FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Poll creators can update" ON public.polls FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Poll creators can delete" ON public.polls FOR DELETE USING (auth.uid() = created_by);

-- RLS for poll options
CREATE POLICY "Poll options viewable by everyone" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Poll creators can manage options" ON public.poll_options FOR ALL USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()));

-- RLS for poll votes
CREATE POLICY "Poll votes viewable by everyone" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

-- RLS for live streams
CREATE POLICY "Live streams are viewable" ON public.live_streams FOR SELECT USING (privacy = 'public' OR auth.uid() = host_id);
CREATE POLICY "Users can create streams" ON public.live_streams FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update streams" ON public.live_streams FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete streams" ON public.live_streams FOR DELETE USING (auth.uid() = host_id);

-- RLS for live stream comments
CREATE POLICY "Stream comments are viewable" ON public.live_stream_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment on streams" ON public.live_stream_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their comments" ON public.live_stream_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS for mentions
CREATE POLICY "Mentions are viewable" ON public.mentions FOR SELECT USING (auth.uid() = mentioned_user_id OR auth.uid() = mentioner_id);
CREATE POLICY "Users can create mentions" ON public.mentions FOR INSERT WITH CHECK (auth.uid() = mentioner_id);

-- RLS for templates
CREATE POLICY "Public templates viewable by everyone" ON public.post_templates FOR SELECT USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "Users can create templates" ON public.post_templates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Template creators can update" ON public.post_templates FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Template creators can delete" ON public.post_templates FOR DELETE USING (auth.uid() = created_by);

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;