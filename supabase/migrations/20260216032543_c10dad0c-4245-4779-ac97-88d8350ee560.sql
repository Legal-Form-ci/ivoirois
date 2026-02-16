
-- Fix ALL restrictive-only policies on stories table
DROP POLICY IF EXISTS "Stories viewable by authenticated users" ON public.stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;

CREATE POLICY "Stories viewable by authenticated users" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stories" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix story_views
DROP POLICY IF EXISTS "Story views viewable by authenticated users" ON public.story_views;
DROP POLICY IF EXISTS "Users can record views" ON public.story_views;
CREATE POLICY "Story views viewable by authenticated users" ON public.story_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can record views" ON public.story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

-- Fix story_reactions
DROP POLICY IF EXISTS "Story reactions viewable by authenticated users" ON public.story_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.story_reactions;
DROP POLICY IF EXISTS "Users can delete their reactions" ON public.story_reactions;
CREATE POLICY "Story reactions viewable by authenticated users" ON public.story_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add reactions" ON public.story_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their reactions" ON public.story_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix profiles
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Fix posts
DROP POLICY IF EXISTS "Posts viewable by authenticated users" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Posts viewable by authenticated users" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix comments
DROP POLICY IF EXISTS "Comments viewable by authenticated users" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can comment on posts" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Comments viewable by authenticated users" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix likes
DROP POLICY IF EXISTS "Likes viewable by authenticated users" ON public.likes;
DROP POLICY IF EXISTS "Users can create likes" ON public.likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
CREATE POLICY "Likes viewable by authenticated users" ON public.likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create likes" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix reactions
DROP POLICY IF EXISTS "Reactions viewable by authenticated users" ON public.reactions;
DROP POLICY IF EXISTS "Users can create reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can react to posts" ON public.reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.reactions;
CREATE POLICY "Reactions viewable by authenticated users" ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reactions" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reactions" ON public.reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions" ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix groups
DROP POLICY IF EXISTS "Groups viewable by authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete" ON public.groups;
CREATE POLICY "Groups viewable by authenticated users" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Group creators can delete" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Fix group_members
DROP POLICY IF EXISTS "Group members viewable by authenticated users" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Group members viewable by authenticated users" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix polls
DROP POLICY IF EXISTS "Polls viewable by authenticated users" ON public.polls;
DROP POLICY IF EXISTS "Users can create polls" ON public.polls;
DROP POLICY IF EXISTS "Poll creators can update" ON public.polls;
DROP POLICY IF EXISTS "Poll creators can delete" ON public.polls;
CREATE POLICY "Polls viewable by authenticated users" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create polls" ON public.polls FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Poll creators can update" ON public.polls FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Poll creators can delete" ON public.polls FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Fix poll_options
DROP POLICY IF EXISTS "Poll options viewable by authenticated users" ON public.poll_options;
DROP POLICY IF EXISTS "Poll creators can manage options" ON public.poll_options;
CREATE POLICY "Poll options viewable by authenticated users" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Poll creators can manage options" ON public.poll_options FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()));

-- Fix poll_votes
DROP POLICY IF EXISTS "Poll votes viewable by authenticated users" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can vote on polls" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can change vote" ON public.poll_votes;
CREATE POLICY "Poll votes viewable by authenticated users" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can vote on polls" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can change vote" ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix friendships
DROP POLICY IF EXISTS "Friendships viewable by involved users" ON public.friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;
CREATE POLICY "Friendships viewable by involved users" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can create friendships" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their friendships" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can delete their friendships" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Fix notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Fix conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid()));
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);

-- Fix conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can add participants" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Users can update their own participant record" ON public.conversation_participants FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Fix messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());

-- Fix events
DROP POLICY IF EXISTS "Events viewable by authenticated users" ON public.events;
DROP POLICY IF EXISTS "Users can create events" ON public.events;
DROP POLICY IF EXISTS "Event creators can update" ON public.events;
DROP POLICY IF EXISTS "Event creators can delete" ON public.events;
CREATE POLICY "Events viewable by authenticated users" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Event creators can update" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Event creators can delete" ON public.events FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Fix event_attendees
DROP POLICY IF EXISTS "Event attendees viewable by authenticated users" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can RSVP" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can attend events" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can update their RSVP" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can delete their RSVP" ON public.event_attendees;
CREATE POLICY "Event attendees viewable by authenticated users" ON public.event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can RSVP" ON public.event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their RSVP" ON public.event_attendees FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their RSVP" ON public.event_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix companies
DROP POLICY IF EXISTS "Companies viewable by authenticated" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Company creators can update" ON public.companies;
DROP POLICY IF EXISTS "Company creators can delete" ON public.companies;
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;
CREATE POLICY "Companies viewable by authenticated" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Company creators can update" ON public.companies FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Company creators can delete" ON public.companies FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Super admins can manage all companies" ON public.companies FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Fix pages
DROP POLICY IF EXISTS "Pages viewable by authenticated users" ON public.pages;
DROP POLICY IF EXISTS "Users can create pages" ON public.pages;
DROP POLICY IF EXISTS "Page creators can update" ON public.pages;
DROP POLICY IF EXISTS "Page creators can delete" ON public.pages;
CREATE POLICY "Pages viewable by authenticated users" ON public.pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create pages" ON public.pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Page creators can update" ON public.pages FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Page creators can delete" ON public.pages FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Fix page_followers
DROP POLICY IF EXISTS "Page followers viewable by authenticated users" ON public.page_followers;
DROP POLICY IF EXISTS "Users can follow pages" ON public.page_followers;
DROP POLICY IF EXISTS "Users can unfollow pages" ON public.page_followers;
CREATE POLICY "Page followers viewable by authenticated users" ON public.page_followers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can follow pages" ON public.page_followers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unfollow pages" ON public.page_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix marketplace
DROP POLICY IF EXISTS "Active listings are viewable" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can create listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can update listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can delete listings" ON public.marketplace_listings;
CREATE POLICY "Active listings are viewable" ON public.marketplace_listings FOR SELECT TO authenticated USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "Users can create listings" ON public.marketplace_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update listings" ON public.marketplace_listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete listings" ON public.marketplace_listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- Fix marketplace_favorites
DROP POLICY IF EXISTS "Users can view their favorites" ON public.marketplace_favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.marketplace_favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.marketplace_favorites;
CREATE POLICY "Users can view their favorites" ON public.marketplace_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.marketplace_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.marketplace_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix job_posts
DROP POLICY IF EXISTS "Job posts are viewable by everyone" ON public.job_posts;
DROP POLICY IF EXISTS "Company members can create jobs" ON public.job_posts;
DROP POLICY IF EXISTS "Job creators can update" ON public.job_posts;
DROP POLICY IF EXISTS "Job creators can delete" ON public.job_posts;
CREATE POLICY "Job posts are viewable by everyone" ON public.job_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Company members can create jobs" ON public.job_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Job creators can update" ON public.job_posts FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Job creators can delete" ON public.job_posts FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Fix job_applications
DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can delete their applications" ON public.job_applications;
CREATE POLICY "Users can view their own applications" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Employers can view applications for their jobs" ON public.job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM job_posts jp WHERE jp.id = job_applications.job_id AND jp.created_by = auth.uid()));
CREATE POLICY "Users can create applications" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their applications" ON public.job_applications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix reels
DROP POLICY IF EXISTS "Reels viewable by authenticated users" ON public.reels;
DROP POLICY IF EXISTS "Users can create reels" ON public.reels;
DROP POLICY IF EXISTS "Users can update their reels" ON public.reels;
DROP POLICY IF EXISTS "Users can delete their reels" ON public.reels;
CREATE POLICY "Reels viewable by authenticated users" ON public.reels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reels" ON public.reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reels" ON public.reels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reels" ON public.reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix reel_likes
DROP POLICY IF EXISTS "Reel likes viewable" ON public.reel_likes;
DROP POLICY IF EXISTS "Users can like reels" ON public.reel_likes;
DROP POLICY IF EXISTS "Users can unlike reels" ON public.reel_likes;
CREATE POLICY "Reel likes viewable" ON public.reel_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like reels" ON public.reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike reels" ON public.reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix reel_comments
DROP POLICY IF EXISTS "Reel comments viewable by authenticated users" ON public.reel_comments;
DROP POLICY IF EXISTS "Users can comment on public reels" ON public.reel_comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON public.reel_comments;
CREATE POLICY "Reel comments viewable by authenticated users" ON public.reel_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment on reels" ON public.reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their reel comments" ON public.reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix post_shares
DROP POLICY IF EXISTS "Post shares viewable by authenticated users" ON public.post_shares;
DROP POLICY IF EXISTS "Users can share posts" ON public.post_shares;
DROP POLICY IF EXISTS "Users can delete their shares" ON public.post_shares;
CREATE POLICY "Post shares viewable by authenticated users" ON public.post_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can share posts" ON public.post_shares FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their shares" ON public.post_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix saved_posts
DROP POLICY IF EXISTS "Users can view saved posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can save posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can unsave posts" ON public.saved_posts;
CREATE POLICY "Users can view saved posts" ON public.saved_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts" ON public.saved_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts" ON public.saved_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix certifications
DROP POLICY IF EXISTS "Certifications viewable by authenticated users" ON public.certifications;
DROP POLICY IF EXISTS "Admins can manage certifications" ON public.certifications;
CREATE POLICY "Certifications viewable by authenticated users" ON public.certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage certifications" ON public.certifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Fix reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Super admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Super admins can update reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Fix admin_logs
DROP POLICY IF EXISTS "Only admins can view logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can create logs" ON public.admin_logs;
CREATE POLICY "Only admins can view logs" ON public.admin_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Fix user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Fix call_signals
DROP POLICY IF EXISTS "Users can view signals in their calls" ON public.call_signals;
DROP POLICY IF EXISTS "Users can create signals" ON public.call_signals;
DROP POLICY IF EXISTS "Users can delete their signals" ON public.call_signals;
CREATE POLICY "Users can view signals in their calls" ON public.call_signals FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Users can create signals" ON public.call_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Users can delete their signals" ON public.call_signals FOR DELETE TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Fix group_messages
DROP POLICY IF EXISTS "Group messages viewable by members" ON public.group_messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.group_messages;
CREATE POLICY "Group messages viewable by members" ON public.group_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Members can send messages" ON public.group_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid()));

-- Fix mentions
DROP POLICY IF EXISTS "Mentions are viewable" ON public.mentions;
DROP POLICY IF EXISTS "Users can create mentions" ON public.mentions;
CREATE POLICY "Mentions are viewable" ON public.mentions FOR SELECT TO authenticated USING (auth.uid() = mentioned_user_id OR auth.uid() = mentioner_id);
CREATE POLICY "Users can create mentions" ON public.mentions FOR INSERT TO authenticated WITH CHECK (mentioner_id = auth.uid());

-- Fix message_reactions
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON public.message_reactions;
DROP POLICY IF EXISTS "Participants can react to messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()));
CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix message_attachments
DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can create attachments" ON public.message_attachments;
CREATE POLICY "Users can view attachments in their conversations" ON public.message_attachments FOR SELECT TO authenticated USING (can_access_message(message_id, auth.uid()));
CREATE POLICY "Users can create attachments" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (can_access_message(message_id, auth.uid()));

-- Fix voice_messages
DROP POLICY IF EXISTS "Users can view voice messages in their conversations" ON public.voice_messages;
DROP POLICY IF EXISTS "Users can create voice messages" ON public.voice_messages;
CREATE POLICY "Users can view voice messages in their conversations" ON public.voice_messages FOR SELECT TO authenticated USING (can_access_message(message_id, auth.uid()));
CREATE POLICY "Users can create voice messages" ON public.voice_messages FOR INSERT TO authenticated WITH CHECK (can_access_message(message_id, auth.uid()));

-- Fix resumes
DROP POLICY IF EXISTS "Anyone can view public resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can view their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can create their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON public.resumes;
CREATE POLICY "Anyone can view public resumes" ON public.resumes FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Users can view their own resumes" ON public.resumes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own resumes" ON public.resumes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own resumes" ON public.resumes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own resumes" ON public.resumes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix live_streams
DROP POLICY IF EXISTS "Live streams viewable by authenticated users" ON public.live_streams;
DROP POLICY IF EXISTS "Users can create live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Stream hosts can update" ON public.live_streams;
DROP POLICY IF EXISTS "Stream hosts can delete" ON public.live_streams;
CREATE POLICY "Live streams viewable by authenticated users" ON public.live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create live streams" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Stream hosts can update" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "Stream hosts can delete" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- Fix live_stream_comments
DROP POLICY IF EXISTS "Stream comments viewable by authenticated users" ON public.live_stream_comments;
DROP POLICY IF EXISTS "Users can comment on streams" ON public.live_stream_comments;
DROP POLICY IF EXISTS "Authenticated users can comment on streams" ON public.live_stream_comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON public.live_stream_comments;
CREATE POLICY "Stream comments viewable by authenticated users" ON public.live_stream_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment on streams" ON public.live_stream_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their stream comments" ON public.live_stream_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix scheduled_messages
DROP POLICY IF EXISTS "Users can view their scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can create scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can update scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can delete scheduled messages" ON public.scheduled_messages;
CREATE POLICY "Users can view their scheduled messages" ON public.scheduled_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Users can create scheduled messages" ON public.scheduled_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update scheduled messages" ON public.scheduled_messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete scheduled messages" ON public.scheduled_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- Fix scheduled_posts
DROP POLICY IF EXISTS "Users can view their scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can create scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can update scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can delete scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can view their scheduled posts" ON public.scheduled_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create scheduled posts" ON public.scheduled_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update scheduled posts" ON public.scheduled_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete scheduled posts" ON public.scheduled_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix content_recommendations
DROP POLICY IF EXISTS "Users can view their recommendations" ON public.content_recommendations;
DROP POLICY IF EXISTS "System can create recommendations" ON public.content_recommendations;
DROP POLICY IF EXISTS "Users can update their recommendations" ON public.content_recommendations;
CREATE POLICY "Users can view their recommendations" ON public.content_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can create recommendations" ON public.content_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their recommendations" ON public.content_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix user_interactions
DROP POLICY IF EXISTS "Users can view their interactions" ON public.user_interactions;
DROP POLICY IF EXISTS "Users can create interactions" ON public.user_interactions;
CREATE POLICY "Users can view their interactions" ON public.user_interactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create interactions" ON public.user_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix translations
DROP POLICY IF EXISTS "Translations viewable by everyone" ON public.translations;
DROP POLICY IF EXISTS "Only admins can manage translations" ON public.translations;
CREATE POLICY "Translations viewable by everyone" ON public.translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage translations" ON public.translations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Fix admin_media
DROP POLICY IF EXISTS "Admin media viewable by everyone" ON public.admin_media;
DROP POLICY IF EXISTS "Only admins can manage media" ON public.admin_media;
CREATE POLICY "Admin media viewable by everyone" ON public.admin_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage media" ON public.admin_media FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Fix push_subscriptions
DROP POLICY IF EXISTS "Users can view their subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can create subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix post_templates
DROP POLICY IF EXISTS "Public templates viewable" ON public.post_templates;
DROP POLICY IF EXISTS "Users can create templates" ON public.post_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.post_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.post_templates;
CREATE POLICY "Public templates viewable" ON public.post_templates FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "Users can create templates" ON public.post_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own templates" ON public.post_templates FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own templates" ON public.post_templates FOR DELETE TO authenticated USING (auth.uid() = created_by);
