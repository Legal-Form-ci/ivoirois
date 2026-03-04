
-- ============================================
-- FIX ALL RLS POLICIES: RESTRICTIVE -> PERMISSIVE
-- ============================================

-- STORIES
DROP POLICY IF EXISTS "Stories viewable by authenticated users" ON public.stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;

CREATE POLICY "Stories viewable by authenticated" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete stories" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STORY_REACTIONS
DROP POLICY IF EXISTS "Story reactions viewable by authenticated users" ON public.story_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.story_reactions;
DROP POLICY IF EXISTS "Users can delete their reactions" ON public.story_reactions;

CREATE POLICY "Story reactions viewable" ON public.story_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add story reactions" ON public.story_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete story reactions" ON public.story_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STORY_VIEWS  
DROP POLICY IF EXISTS "Story views viewable by story owner" ON public.story_views;
DROP POLICY IF EXISTS "Users can record views" ON public.story_views;
DROP POLICY IF EXISTS "Story views - select" ON public.story_views;
DROP POLICY IF EXISTS "Story views - insert" ON public.story_views;

CREATE POLICY "Story views select" ON public.story_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "Story views insert" ON public.story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

-- PROFILES
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Profiles select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- POSTS
DROP POLICY IF EXISTS "Posts viewable by authenticated users" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;

CREATE POLICY "Posts select" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Posts insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Posts delete" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Posts update" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- COMMENTS
DROP POLICY IF EXISTS "Comments viewable by authenticated users" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;

CREATE POLICY "Comments select" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comments insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Comments delete" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Comments update" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- LIKES
DROP POLICY IF EXISTS "Likes viewable by authenticated users" ON public.likes;
DROP POLICY IF EXISTS "Users can create likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

CREATE POLICY "Likes select" ON public.likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Likes insert" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Likes delete" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REACTIONS
DROP POLICY IF EXISTS "Reactions viewable by authenticated users" ON public.reactions;
DROP POLICY IF EXISTS "Users can create reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.reactions;

CREATE POLICY "Reactions select" ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reactions insert" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reactions delete" ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Reactions update" ON public.reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- CONVERSATIONS
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Conversations insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Conversations select" ON public.conversations FOR SELECT TO authenticated USING (true);

-- CONVERSATION_PARTICIPANTS
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

CREATE POLICY "Conv participants select" ON public.conversation_participants FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Conv participants insert" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Conv participants update" ON public.conversation_participants FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- MESSAGES
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Messages select" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Messages insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Messages update" ON public.messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());

-- FRIENDSHIPS
DROP POLICY IF EXISTS "Friendships viewable by involved users" ON public.friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;

CREATE POLICY "Friendships select" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Friendships insert" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Friendships delete" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Friendships update" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Notifications select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- GROUPS
DROP POLICY IF EXISTS "Groups viewable by authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete" ON public.groups;

CREATE POLICY "Groups select" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Groups insert" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Groups update" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Groups delete" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- GROUP_MEMBERS
DROP POLICY IF EXISTS "Group members viewable by authenticated users" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

CREATE POLICY "Group members select" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Group members insert" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Group members delete" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- GROUP_MESSAGES
DROP POLICY IF EXISTS "Group messages viewable by members" ON public.group_messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.group_messages;

CREATE POLICY "Group messages select" ON public.group_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));
CREATE POLICY "Group messages insert" ON public.group_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

-- MARKETPLACE_LISTINGS
DROP POLICY IF EXISTS "Active listings are viewable" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can create listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can update listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can delete listings" ON public.marketplace_listings;

CREATE POLICY "Listings select" ON public.marketplace_listings FOR SELECT TO authenticated USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "Listings insert" ON public.marketplace_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Listings update" ON public.marketplace_listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Listings delete" ON public.marketplace_listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- MARKETPLACE_FAVORITES
DROP POLICY IF EXISTS "Users can view their favorites" ON public.marketplace_favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.marketplace_favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.marketplace_favorites;

CREATE POLICY "Favorites select" ON public.marketplace_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Favorites insert" ON public.marketplace_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Favorites delete" ON public.marketplace_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- EVENTS
DROP POLICY IF EXISTS "Events viewable by authenticated users" ON public.events;
DROP POLICY IF EXISTS "Users can create events" ON public.events;
DROP POLICY IF EXISTS "Event creators can update" ON public.events;
DROP POLICY IF EXISTS "Event creators can delete" ON public.events;

CREATE POLICY "Events select" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Events insert" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Events update" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Events delete" ON public.events FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- EVENT_ATTENDEES
DROP POLICY IF EXISTS "Event attendees viewable by authenticated users" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can RSVP" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can delete their RSVP" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can update their RSVP" ON public.event_attendees;

CREATE POLICY "Event attendees select" ON public.event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Event attendees insert" ON public.event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Event attendees delete" ON public.event_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Event attendees update" ON public.event_attendees FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- COMPANIES
DROP POLICY IF EXISTS "Companies viewable by authenticated" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Company creators can update" ON public.companies;
DROP POLICY IF EXISTS "Company creators can delete" ON public.companies;
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;

CREATE POLICY "Companies select" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Companies insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Companies update" ON public.companies FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Companies delete" ON public.companies FOR DELETE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'));

-- JOB_POSTS
DROP POLICY IF EXISTS "Job posts are viewable by everyone" ON public.job_posts;
DROP POLICY IF EXISTS "Company members can create jobs" ON public.job_posts;
DROP POLICY IF EXISTS "Job creators can update" ON public.job_posts;
DROP POLICY IF EXISTS "Job creators can delete" ON public.job_posts;

CREATE POLICY "Jobs select" ON public.job_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Jobs insert" ON public.job_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Jobs update" ON public.job_posts FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Jobs delete" ON public.job_posts FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- JOB_APPLICATIONS
DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can delete their applications" ON public.job_applications;

CREATE POLICY "Job apps select own" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM job_posts WHERE id = job_applications.job_id AND created_by = auth.uid()));
CREATE POLICY "Job apps insert" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Job apps delete" ON public.job_applications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PAGES
DROP POLICY IF EXISTS "Pages viewable by authenticated" ON public.pages;
DROP POLICY IF EXISTS "Users can create pages" ON public.pages;
DROP POLICY IF EXISTS "Page creators can update" ON public.pages;
DROP POLICY IF EXISTS "Page creators can delete" ON public.pages;

CREATE POLICY "Pages select" ON public.pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pages insert" ON public.pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Pages update" ON public.pages FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Pages delete" ON public.pages FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- PAGE_FOLLOWERS
DROP POLICY IF EXISTS "Page followers viewable by authenticated users" ON public.page_followers;
DROP POLICY IF EXISTS "Users can follow pages" ON public.page_followers;
DROP POLICY IF EXISTS "Users can unfollow pages" ON public.page_followers;

CREATE POLICY "Page followers select" ON public.page_followers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Page followers insert" ON public.page_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Page followers delete" ON public.page_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLLS
DROP POLICY IF EXISTS "Polls viewable by authenticated users" ON public.polls;
DROP POLICY IF EXISTS "Users can create polls" ON public.polls;
DROP POLICY IF EXISTS "Poll creators can update" ON public.polls;
DROP POLICY IF EXISTS "Poll creators can delete" ON public.polls;

CREATE POLICY "Polls select" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Polls insert" ON public.polls FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Polls update" ON public.polls FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Polls delete" ON public.polls FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- POLL_OPTIONS
DROP POLICY IF EXISTS "Poll options viewable by authenticated users" ON public.poll_options;
DROP POLICY IF EXISTS "Poll creators can manage options" ON public.poll_options;

CREATE POLICY "Poll options select" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Poll options manage" ON public.poll_options FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM polls WHERE id = poll_options.poll_id AND created_by = auth.uid()));

-- POLL_VOTES
DROP POLICY IF EXISTS "Poll votes viewable by authenticated users" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can vote on polls" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can change vote" ON public.poll_votes;

CREATE POLICY "Poll votes select" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Poll votes insert" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Poll votes delete" ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REELS
DROP POLICY IF EXISTS "Reels viewable by authenticated" ON public.reels;
DROP POLICY IF EXISTS "Users can create reels" ON public.reels;
DROP POLICY IF EXISTS "Users can update their reels" ON public.reels;
DROP POLICY IF EXISTS "Users can delete their reels" ON public.reels;

CREATE POLICY "Reels select" ON public.reels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reels insert" ON public.reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reels update" ON public.reels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Reels delete" ON public.reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REEL_LIKES
DROP POLICY IF EXISTS "Reel likes viewable" ON public.reel_likes;
DROP POLICY IF EXISTS "Users can like reels" ON public.reel_likes;
DROP POLICY IF EXISTS "Users can unlike reels" ON public.reel_likes;

CREATE POLICY "Reel likes select" ON public.reel_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reel likes insert" ON public.reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reel likes delete" ON public.reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REEL_COMMENTS
DROP POLICY IF EXISTS "Reel comments viewable by authenticated users" ON public.reel_comments;
DROP POLICY IF EXISTS "Users can comment on reels" ON public.reel_comments;
DROP POLICY IF EXISTS "Users can delete their reel comments" ON public.reel_comments;

CREATE POLICY "Reel comments select" ON public.reel_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reel comments insert" ON public.reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reel comments delete" ON public.reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CALL_SIGNALS
DROP POLICY IF EXISTS "Users can create signals" ON public.call_signals;
DROP POLICY IF EXISTS "Users can view signals in their calls" ON public.call_signals;
DROP POLICY IF EXISTS "Users can delete their signals" ON public.call_signals;

CREATE POLICY "Call signals select" ON public.call_signals FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Call signals insert" ON public.call_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Call signals delete" ON public.call_signals FOR DELETE TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- MESSAGE_REACTIONS
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON public.message_reactions;

CREATE POLICY "Msg reactions select" ON public.message_reactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()));
CREATE POLICY "Msg reactions insert" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Msg reactions delete" ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- MESSAGE_ATTACHMENTS
DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can add attachments" ON public.message_attachments;

CREATE POLICY "Msg attachments select" ON public.message_attachments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_attachments.message_id AND cp.user_id = auth.uid()));
CREATE POLICY "Msg attachments insert" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (true);

-- VOICE_MESSAGES
DROP POLICY IF EXISTS "Users can create voice messages" ON public.voice_messages;
DROP POLICY IF EXISTS "Users can view voice messages in their conversations" ON public.voice_messages;

CREATE POLICY "Voice msgs select" ON public.voice_messages FOR SELECT TO authenticated USING (can_access_message(message_id, auth.uid()));
CREATE POLICY "Voice msgs insert" ON public.voice_messages FOR INSERT TO authenticated WITH CHECK (can_access_message(message_id, auth.uid()));

-- POST_SHARES
DROP POLICY IF EXISTS "Post shares viewable by authenticated users" ON public.post_shares;
DROP POLICY IF EXISTS "Users can share posts" ON public.post_shares;
DROP POLICY IF EXISTS "Users can delete their shares" ON public.post_shares;

CREATE POLICY "Post shares select" ON public.post_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "Post shares insert" ON public.post_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Post shares delete" ON public.post_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- MENTIONS
DROP POLICY IF EXISTS "Mentions are viewable" ON public.mentions;
DROP POLICY IF EXISTS "Users can create mentions" ON public.mentions;

CREATE POLICY "Mentions select" ON public.mentions FOR SELECT TO authenticated USING (auth.uid() = mentioned_user_id OR auth.uid() = mentioner_id);
CREATE POLICY "Mentions insert" ON public.mentions FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentioner_id);

-- SCHEDULED_POSTS
DROP POLICY IF EXISTS "Users can view their scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can create scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can update scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can delete scheduled posts" ON public.scheduled_posts;

CREATE POLICY "Sched posts select" ON public.scheduled_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Sched posts insert" ON public.scheduled_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sched posts update" ON public.scheduled_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Sched posts delete" ON public.scheduled_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SCHEDULED_MESSAGES
DROP POLICY IF EXISTS "Users can view their scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can create scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can update scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can delete scheduled messages" ON public.scheduled_messages;

CREATE POLICY "Sched msgs select" ON public.scheduled_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Sched msgs insert" ON public.scheduled_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Sched msgs update" ON public.scheduled_messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Sched msgs delete" ON public.scheduled_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- RESUMES
DROP POLICY IF EXISTS "Anyone can view public resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can view their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can create their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON public.resumes;

CREATE POLICY "Resumes select" ON public.resumes FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Resumes insert" ON public.resumes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Resumes update" ON public.resumes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Resumes delete" ON public.resumes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REPORTS
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

CREATE POLICY "Reports insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reports select" ON public.reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Reports update" ON public.reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- CERTIFICATIONS
DROP POLICY IF EXISTS "Certifications viewable by authenticated users" ON public.certifications;
DROP POLICY IF EXISTS "Admins can manage certifications" ON public.certifications;

CREATE POLICY "Certs select" ON public.certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Certs manage" ON public.certifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- CONTENT_RECOMMENDATIONS
DROP POLICY IF EXISTS "Users can view their recommendations" ON public.content_recommendations;
DROP POLICY IF EXISTS "System can create recommendations" ON public.content_recommendations;
DROP POLICY IF EXISTS "Users can update their recommendations" ON public.content_recommendations;

CREATE POLICY "Recs select" ON public.content_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Recs insert" ON public.content_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recs update" ON public.content_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- USER_INTERACTIONS
DROP POLICY IF EXISTS "Users can view their interactions" ON public.user_interactions;
DROP POLICY IF EXISTS "Users can create interactions" ON public.user_interactions;

CREATE POLICY "Interactions select" ON public.user_interactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Interactions insert" ON public.user_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

CREATE POLICY "Roles select own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Roles manage" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- LIVE_STREAMS
DROP POLICY IF EXISTS "Live streams viewable" ON public.live_streams;
DROP POLICY IF EXISTS "Users can create streams" ON public.live_streams;
DROP POLICY IF EXISTS "Stream hosts can update" ON public.live_streams;

CREATE POLICY "Streams select" ON public.live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Streams insert" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Streams update" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- LIVE_STREAM_COMMENTS
DROP POLICY IF EXISTS "Stream comments viewable by authenticated users" ON public.live_stream_comments;
DROP POLICY IF EXISTS "Users can comment on streams" ON public.live_stream_comments;
DROP POLICY IF EXISTS "Users can delete their stream comments" ON public.live_stream_comments;

CREATE POLICY "Stream comments select" ON public.live_stream_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Stream comments insert" ON public.live_stream_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Stream comments delete" ON public.live_stream_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PUSH_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Push subs select" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Push subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Push subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POST_TEMPLATES
DROP POLICY IF EXISTS "Public templates viewable" ON public.post_templates;
DROP POLICY IF EXISTS "Users can create templates" ON public.post_templates;
DROP POLICY IF EXISTS "Users can update their templates" ON public.post_templates;

CREATE POLICY "Templates select" ON public.post_templates FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "Templates insert" ON public.post_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Templates update" ON public.post_templates FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- ADMIN_LOGS
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can create logs" ON public.admin_logs;

CREATE POLICY "Admin logs select" ON public.admin_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin logs insert" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- TRANSLATIONS (keep restrictive for admin-only management, but ensure select works)
DROP POLICY IF EXISTS "Only admins can manage translations" ON public.translations;
DROP POLICY IF EXISTS "Translations viewable by everyone" ON public.translations;

CREATE POLICY "Translations select" ON public.translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Translations manage" ON public.translations FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- ADMIN_MEDIA
DROP POLICY IF EXISTS "Admin media viewable by everyone" ON public.admin_media;
DROP POLICY IF EXISTS "Only admins can manage media" ON public.admin_media;

CREATE POLICY "Admin media select" ON public.admin_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin media manage" ON public.admin_media FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
