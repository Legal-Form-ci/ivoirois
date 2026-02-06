-- ====================================================================
-- SECURITY HARDENING: Restrict public data exposure to authenticated users
-- ====================================================================

-- 1. PROFILES: Require authentication for viewing
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

-- 2. COMMENTS: Require authentication
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments viewable by authenticated users" 
ON public.comments FOR SELECT 
TO authenticated
USING (true);

-- 3. POSTS: Require authentication (if platform requires login to view content)
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts viewable by authenticated users" 
ON public.posts FOR SELECT 
TO authenticated
USING (true);

-- 4. LIKES: Require authentication
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes viewable by authenticated users" 
ON public.likes FOR SELECT 
TO authenticated
USING (true);

-- 5. REACTIONS: Require authentication
DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.reactions;
CREATE POLICY "Reactions viewable by authenticated users" 
ON public.reactions FOR SELECT 
TO authenticated
USING (true);

-- 6. STORIES: Require authentication
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;
CREATE POLICY "Stories viewable by authenticated users" 
ON public.stories FOR SELECT 
TO authenticated
USING (true);

-- 7. GROUPS: Require authentication (public groups still visible to all authenticated users)
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON public.groups;
CREATE POLICY "Groups viewable by authenticated users" 
ON public.groups FOR SELECT 
TO authenticated
USING (true);

-- 8. GROUP MEMBERS: Require authentication
DROP POLICY IF EXISTS "Group members are viewable by everyone" ON public.group_members;
CREATE POLICY "Group members viewable by authenticated users" 
ON public.group_members FOR SELECT 
TO authenticated
USING (true);

-- 9. CERTIFICATIONS: Require authentication
DROP POLICY IF EXISTS "Certifications are viewable by everyone" ON public.certifications;
CREATE POLICY "Certifications viewable by authenticated users" 
ON public.certifications FOR SELECT 
TO authenticated
USING (true);

-- 10. PAGES: Require authentication
DROP POLICY IF EXISTS "Pages are viewable by everyone" ON public.pages;
CREATE POLICY "Pages viewable by authenticated users" 
ON public.pages FOR SELECT 
TO authenticated
USING (true);

-- 11. PAGE FOLLOWERS: Require authentication
DROP POLICY IF EXISTS "Page followers viewable by everyone" ON public.page_followers;
CREATE POLICY "Page followers viewable by authenticated users" 
ON public.page_followers FOR SELECT 
TO authenticated
USING (true);

-- 12. POLLS: Require authentication
DROP POLICY IF EXISTS "Polls are viewable by everyone" ON public.polls;
CREATE POLICY "Polls viewable by authenticated users" 
ON public.polls FOR SELECT 
TO authenticated
USING (true);

-- 13. POLL OPTIONS: Require authentication
DROP POLICY IF EXISTS "Poll options viewable by everyone" ON public.poll_options;
CREATE POLICY "Poll options viewable by authenticated users" 
ON public.poll_options FOR SELECT 
TO authenticated
USING (true);

-- 14. POLL VOTES: Require authentication
DROP POLICY IF EXISTS "Poll votes viewable by everyone" ON public.poll_votes;
CREATE POLICY "Poll votes viewable by authenticated users" 
ON public.poll_votes FOR SELECT 
TO authenticated
USING (true);

-- 15. EVENT ATTENDEES: Require authentication
DROP POLICY IF EXISTS "Event attendees viewable by everyone" ON public.event_attendees;
CREATE POLICY "Event attendees viewable by authenticated users" 
ON public.event_attendees FOR SELECT 
TO authenticated
USING (true);

-- 16. POST SHARES: Require authentication
DROP POLICY IF EXISTS "Anyone can view shares" ON public.post_shares;
CREATE POLICY "Post shares viewable by authenticated users" 
ON public.post_shares FOR SELECT 
TO authenticated
USING (true);

-- 17. REEL COMMENTS: Require authentication
DROP POLICY IF EXISTS "Anyone can view reel comments" ON public.reel_comments;
CREATE POLICY "Reel comments viewable by authenticated users" 
ON public.reel_comments FOR SELECT 
TO authenticated
USING (true);

-- 18. LIVE STREAM COMMENTS: Require authentication
DROP POLICY IF EXISTS "Stream comments are viewable" ON public.live_stream_comments;
CREATE POLICY "Stream comments viewable by authenticated users" 
ON public.live_stream_comments FOR SELECT 
TO authenticated
USING (true);

-- 19. STORY REACTIONS: Require authentication
DROP POLICY IF EXISTS "Anyone can view story reactions" ON public.story_reactions;
CREATE POLICY "Story reactions viewable by authenticated users" 
ON public.story_reactions FOR SELECT 
TO authenticated
USING (true);