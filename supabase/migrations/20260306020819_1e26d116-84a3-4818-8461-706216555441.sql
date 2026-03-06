
-- ============================================
-- FIX ALL RLS POLICIES TO PERMISSIVE
-- ============================================

-- PROFILES
DROP POLICY IF EXISTS "Profiles select" ON profiles;
DROP POLICY IF EXISTS "Profiles insert" ON profiles;
DROP POLICY IF EXISTS "Profiles update" ON profiles;
DROP POLICY IF EXISTS "Profiles delete" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- POSTS
DROP POLICY IF EXISTS "Posts delete" ON posts;
DROP POLICY IF EXISTS "Posts insert" ON posts;
DROP POLICY IF EXISTS "Posts select" ON posts;
DROP POLICY IF EXISTS "Posts update" ON posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;

CREATE POLICY "posts_select" ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STORIES
DROP POLICY IF EXISTS "Stories viewable by authenticated" ON stories;
DROP POLICY IF EXISTS "Users can create stories" ON stories;
DROP POLICY IF EXISTS "Users can delete stories" ON stories;

CREATE POLICY "stories_select" ON stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "stories_insert" ON stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_delete" ON stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STORY_VIEWS
DROP POLICY IF EXISTS "Story views viewable" ON story_views;
DROP POLICY IF EXISTS "Users can add story views" ON story_views;
DROP POLICY IF EXISTS "story_views_select" ON story_views;
DROP POLICY IF EXISTS "story_views_insert" ON story_views;

CREATE POLICY "story_views_select_p" ON story_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "story_views_insert_p" ON story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

-- STORY_REACTIONS
DROP POLICY IF EXISTS "Story reactions viewable" ON story_reactions;
DROP POLICY IF EXISTS "Users can add story reactions" ON story_reactions;
DROP POLICY IF EXISTS "Users can delete story reactions" ON story_reactions;

CREATE POLICY "story_reactions_select_p" ON story_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "story_reactions_insert_p" ON story_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "story_reactions_delete_p" ON story_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COMMENTS
DROP POLICY IF EXISTS "Comments delete" ON comments;
DROP POLICY IF EXISTS "Comments insert" ON comments;
DROP POLICY IF EXISTS "Comments select" ON comments;
DROP POLICY IF EXISTS "Comments update" ON comments;

CREATE POLICY "comments_select" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update" ON comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- LIKES
DROP POLICY IF EXISTS "Likes delete" ON likes;
DROP POLICY IF EXISTS "Likes insert" ON likes;
DROP POLICY IF EXISTS "Likes select" ON likes;

CREATE POLICY "likes_select" ON likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert" ON likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REACTIONS
DROP POLICY IF EXISTS "Reactions delete" ON reactions;
DROP POLICY IF EXISTS "Reactions insert" ON reactions;
DROP POLICY IF EXISTS "Reactions select" ON reactions;
DROP POLICY IF EXISTS "Reactions update" ON reactions;

CREATE POLICY "reactions_select" ON reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "reactions_insert" ON reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_update" ON reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CONVERSATIONS
DROP POLICY IF EXISTS "Conv select" ON conversations;
DROP POLICY IF EXISTS "Conv insert" ON conversations;
DROP POLICY IF EXISTS "Conversations select" ON conversations;
DROP POLICY IF EXISTS "Conversations insert" ON conversations;

CREATE POLICY "conversations_select_p" ON conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "conversations_insert_p" ON conversations FOR INSERT TO authenticated WITH CHECK (true);

-- CONVERSATION_PARTICIPANTS
DROP POLICY IF EXISTS "Conv participants insert" ON conversation_participants;
DROP POLICY IF EXISTS "Conv participants select" ON conversation_participants;
DROP POLICY IF EXISTS "Conv participants update" ON conversation_participants;

CREATE POLICY "cp_select_p" ON conversation_participants FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "cp_insert_p" ON conversation_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "cp_update_p" ON conversation_participants FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- MESSAGES
DROP POLICY IF EXISTS "Messages insert" ON messages;
DROP POLICY IF EXISTS "Messages select" ON messages;
DROP POLICY IF EXISTS "Messages update" ON messages;

CREATE POLICY "messages_select_p" ON messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "messages_insert_p" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "messages_update_p" ON messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());

-- FRIENDSHIPS
DROP POLICY IF EXISTS "Friendships delete" ON friendships;
DROP POLICY IF EXISTS "Friendships insert" ON friendships;
DROP POLICY IF EXISTS "Friendships select" ON friendships;
DROP POLICY IF EXISTS "Friendships update" ON friendships;

CREATE POLICY "friendships_select" ON friendships FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friendships_insert" ON friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friendships_update" ON friendships FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friendships_delete" ON friendships FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Notifications select" ON notifications;
DROP POLICY IF EXISTS "Notifications insert" ON notifications;
DROP POLICY IF EXISTS "Notifications update" ON notifications;
DROP POLICY IF EXISTS "Notifications delete" ON notifications;

CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- COMPANIES
DROP POLICY IF EXISTS "Companies delete" ON companies;
DROP POLICY IF EXISTS "Companies insert" ON companies;
DROP POLICY IF EXISTS "Companies select" ON companies;
DROP POLICY IF EXISTS "Companies update" ON companies;

CREATE POLICY "companies_select" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "companies_update" ON companies FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "companies_delete" ON companies FOR DELETE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'));

-- GROUPS
DROP POLICY IF EXISTS "Groups delete" ON groups;
DROP POLICY IF EXISTS "Groups insert" ON groups;
DROP POLICY IF EXISTS "Groups select" ON groups;
DROP POLICY IF EXISTS "Groups update" ON groups;

CREATE POLICY "groups_select" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_insert" ON groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_update" ON groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "groups_delete" ON groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- GROUP_MEMBERS
DROP POLICY IF EXISTS "Group members delete" ON group_members;
DROP POLICY IF EXISTS "Group members insert" ON group_members;
DROP POLICY IF EXISTS "Group members select" ON group_members;

CREATE POLICY "gm_select" ON group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "gm_insert" ON group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gm_delete" ON group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- GROUP_MESSAGES
DROP POLICY IF EXISTS "Group messages insert" ON group_messages;
DROP POLICY IF EXISTS "Group messages select" ON group_messages;

CREATE POLICY "gmsg_select" ON group_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));
CREATE POLICY "gmsg_insert" ON group_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

-- MARKETPLACE_LISTINGS
DROP POLICY IF EXISTS "Listings delete" ON marketplace_listings;
DROP POLICY IF EXISTS "Listings insert" ON marketplace_listings;
DROP POLICY IF EXISTS "Listings select" ON marketplace_listings;
DROP POLICY IF EXISTS "Listings update" ON marketplace_listings;

CREATE POLICY "listings_select" ON marketplace_listings FOR SELECT TO authenticated USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "listings_insert" ON marketplace_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "listings_update" ON marketplace_listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "listings_delete" ON marketplace_listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- MARKETPLACE_FAVORITES
DROP POLICY IF EXISTS "Favorites delete" ON marketplace_favorites;
DROP POLICY IF EXISTS "Favorites insert" ON marketplace_favorites;
DROP POLICY IF EXISTS "Favorites select" ON marketplace_favorites;

CREATE POLICY "favs_select" ON marketplace_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "favs_insert" ON marketplace_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favs_delete" ON marketplace_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- JOB_POSTS
DROP POLICY IF EXISTS "Jobs delete" ON job_posts;
DROP POLICY IF EXISTS "Jobs insert" ON job_posts;
DROP POLICY IF EXISTS "Jobs select" ON job_posts;
DROP POLICY IF EXISTS "Jobs update" ON job_posts;

CREATE POLICY "jobs_select" ON job_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "jobs_insert" ON job_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "jobs_update" ON job_posts FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "jobs_delete" ON job_posts FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- JOB_APPLICATIONS
DROP POLICY IF EXISTS "Job apps delete" ON job_applications;
DROP POLICY IF EXISTS "Job apps insert" ON job_applications;
DROP POLICY IF EXISTS "Job apps select own" ON job_applications;

CREATE POLICY "job_apps_select" ON job_applications FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM job_posts WHERE id = job_applications.job_id AND created_by = auth.uid()));
CREATE POLICY "job_apps_insert" ON job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "job_apps_delete" ON job_applications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- EVENTS
DROP POLICY IF EXISTS "Events delete" ON events;
DROP POLICY IF EXISTS "Events insert" ON events;
DROP POLICY IF EXISTS "Events select" ON events;
DROP POLICY IF EXISTS "Events update" ON events;

CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- EVENT_ATTENDEES
DROP POLICY IF EXISTS "Event attendees delete" ON event_attendees;
DROP POLICY IF EXISTS "Event attendees insert" ON event_attendees;
DROP POLICY IF EXISTS "Event attendees select" ON event_attendees;
DROP POLICY IF EXISTS "Event attendees update" ON event_attendees;

CREATE POLICY "ea_select" ON event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "ea_insert" ON event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ea_update" ON event_attendees FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ea_delete" ON event_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PAGES
DROP POLICY IF EXISTS "Pages delete" ON pages;
DROP POLICY IF EXISTS "Pages insert" ON pages;
DROP POLICY IF EXISTS "Pages select" ON pages;
DROP POLICY IF EXISTS "Pages update" ON pages;

CREATE POLICY "pages_select" ON pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "pages_insert" ON pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "pages_update" ON pages FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "pages_delete" ON pages FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- PAGE_FOLLOWERS
DROP POLICY IF EXISTS "Page followers delete" ON page_followers;
DROP POLICY IF EXISTS "Page followers insert" ON page_followers;
DROP POLICY IF EXISTS "Page followers select" ON page_followers;

CREATE POLICY "pf_select" ON page_followers FOR SELECT TO authenticated USING (true);
CREATE POLICY "pf_insert" ON page_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pf_delete" ON page_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POLLS
DROP POLICY IF EXISTS "Polls delete" ON polls;
DROP POLICY IF EXISTS "Polls insert" ON polls;
DROP POLICY IF EXISTS "Polls select" ON polls;
DROP POLICY IF EXISTS "Polls update" ON polls;

CREATE POLICY "polls_select" ON polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "polls_insert" ON polls FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "polls_update" ON polls FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "polls_delete" ON polls FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- POLL_OPTIONS
DROP POLICY IF EXISTS "Poll options manage" ON poll_options;
DROP POLICY IF EXISTS "Poll options select" ON poll_options;

CREATE POLICY "po_select" ON poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "po_manage" ON poll_options FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM polls WHERE id = poll_options.poll_id AND created_by = auth.uid()));

-- POLL_VOTES
DROP POLICY IF EXISTS "Poll votes delete" ON poll_votes;
DROP POLICY IF EXISTS "Poll votes insert" ON poll_votes;
DROP POLICY IF EXISTS "Poll votes select" ON poll_votes;

CREATE POLICY "pv_select" ON poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_insert" ON poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pv_delete" ON poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REELS
DROP POLICY IF EXISTS "Reels delete" ON reels;
DROP POLICY IF EXISTS "Reels insert" ON reels;
DROP POLICY IF EXISTS "Reels select" ON reels;
DROP POLICY IF EXISTS "Reels update" ON reels;

CREATE POLICY "reels_select" ON reels FOR SELECT TO authenticated USING (true);
CREATE POLICY "reels_insert" ON reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reels_update" ON reels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reels_delete" ON reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REEL_LIKES
DROP POLICY IF EXISTS "Reel likes delete" ON reel_likes;
DROP POLICY IF EXISTS "Reel likes insert" ON reel_likes;
DROP POLICY IF EXISTS "Reel likes select" ON reel_likes;

CREATE POLICY "rl_select" ON reel_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "rl_insert" ON reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rl_delete" ON reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REEL_COMMENTS
DROP POLICY IF EXISTS "Reel comments delete" ON reel_comments;
DROP POLICY IF EXISTS "Reel comments insert" ON reel_comments;
DROP POLICY IF EXISTS "Reel comments select" ON reel_comments;

CREATE POLICY "rc_select" ON reel_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "rc_insert" ON reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rc_delete" ON reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RESUMES
DROP POLICY IF EXISTS "Resumes delete" ON resumes;
DROP POLICY IF EXISTS "Resumes insert" ON resumes;
DROP POLICY IF EXISTS "Resumes select" ON resumes;
DROP POLICY IF EXISTS "Resumes update" ON resumes;

CREATE POLICY "resumes_select" ON resumes FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "resumes_insert" ON resumes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "resumes_update" ON resumes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "resumes_delete" ON resumes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- LIVE_STREAMS
DROP POLICY IF EXISTS "Streams delete" ON live_streams;
DROP POLICY IF EXISTS "Streams insert" ON live_streams;
DROP POLICY IF EXISTS "Streams select" ON live_streams;
DROP POLICY IF EXISTS "Streams update" ON live_streams;

CREATE POLICY "streams_select" ON live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "streams_insert" ON live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "streams_update" ON live_streams FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "streams_delete" ON live_streams FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- LIVE_STREAM_COMMENTS
DROP POLICY IF EXISTS "Stream comments delete" ON live_stream_comments;
DROP POLICY IF EXISTS "Stream comments insert" ON live_stream_comments;
DROP POLICY IF EXISTS "Stream comments select" ON live_stream_comments;

CREATE POLICY "lsc_select" ON live_stream_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "lsc_insert" ON live_stream_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lsc_delete" ON live_stream_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- MESSAGE_REACTIONS
DROP POLICY IF EXISTS "Msg reactions delete" ON message_reactions;
DROP POLICY IF EXISTS "Msg reactions insert" ON message_reactions;
DROP POLICY IF EXISTS "Msg reactions select" ON message_reactions;

CREATE POLICY "mr_select" ON message_reactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()));
CREATE POLICY "mr_insert" ON message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mr_delete" ON message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- MESSAGE_ATTACHMENTS
DROP POLICY IF EXISTS "Msg attachments insert" ON message_attachments;
DROP POLICY IF EXISTS "Msg attachments select" ON message_attachments;

CREATE POLICY "ma_select" ON message_attachments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_attachments.message_id AND cp.user_id = auth.uid()));
CREATE POLICY "ma_insert" ON message_attachments FOR INSERT TO authenticated WITH CHECK (true);

-- VOICE_MESSAGES
DROP POLICY IF EXISTS "Voice msgs insert" ON voice_messages;
DROP POLICY IF EXISTS "Voice msgs select" ON voice_messages;

CREATE POLICY "vm_select" ON voice_messages FOR SELECT TO authenticated USING (can_access_message(message_id, auth.uid()));
CREATE POLICY "vm_insert" ON voice_messages FOR INSERT TO authenticated WITH CHECK (can_access_message(message_id, auth.uid()));

-- CALL_SIGNALS
DROP POLICY IF EXISTS "Call signals delete" ON call_signals;
DROP POLICY IF EXISTS "Call signals insert" ON call_signals;
DROP POLICY IF EXISTS "Call signals select" ON call_signals;

CREATE POLICY "cs_select" ON call_signals FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "cs_insert" ON call_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "cs_delete" ON call_signals FOR DELETE TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- MENTIONS
DROP POLICY IF EXISTS "Mentions insert" ON mentions;
DROP POLICY IF EXISTS "Mentions select" ON mentions;

CREATE POLICY "mentions_select" ON mentions FOR SELECT TO authenticated USING (auth.uid() = mentioned_user_id OR auth.uid() = mentioner_id);
CREATE POLICY "mentions_insert" ON mentions FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentioner_id);

-- POST_SHARES
DROP POLICY IF EXISTS "Post shares delete" ON post_shares;
DROP POLICY IF EXISTS "Post shares insert" ON post_shares;
DROP POLICY IF EXISTS "Post shares select" ON post_shares;

CREATE POLICY "ps_select" ON post_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "ps_insert" ON post_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ps_delete" ON post_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POST_TEMPLATES
DROP POLICY IF EXISTS "Templates select" ON post_templates;
DROP POLICY IF EXISTS "Templates insert" ON post_templates;
DROP POLICY IF EXISTS "Templates update" ON post_templates;

CREATE POLICY "pt_select" ON post_templates FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "pt_insert" ON post_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "pt_update" ON post_templates FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- SCHEDULED_POSTS
DROP POLICY IF EXISTS "Sched posts delete" ON scheduled_posts;
DROP POLICY IF EXISTS "Sched posts insert" ON scheduled_posts;
DROP POLICY IF EXISTS "Sched posts select" ON scheduled_posts;
DROP POLICY IF EXISTS "Sched posts update" ON scheduled_posts;

CREATE POLICY "sp_select" ON scheduled_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sp_insert" ON scheduled_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sp_update" ON scheduled_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sp_delete" ON scheduled_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SCHEDULED_MESSAGES
DROP POLICY IF EXISTS "Sched msgs delete" ON scheduled_messages;
DROP POLICY IF EXISTS "Sched msgs insert" ON scheduled_messages;
DROP POLICY IF EXISTS "Sched msgs select" ON scheduled_messages;
DROP POLICY IF EXISTS "Sched msgs update" ON scheduled_messages;

CREATE POLICY "sm_select" ON scheduled_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "sm_insert" ON scheduled_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "sm_update" ON scheduled_messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "sm_delete" ON scheduled_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- PUSH_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Push subs delete" ON push_subscriptions;
DROP POLICY IF EXISTS "Push subs insert" ON push_subscriptions;
DROP POLICY IF EXISTS "Push subs select" ON push_subscriptions;

CREATE POLICY "push_select" ON push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_insert" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_delete" ON push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CONTENT_RECOMMENDATIONS
DROP POLICY IF EXISTS "Recs insert" ON content_recommendations;
DROP POLICY IF EXISTS "Recs select" ON content_recommendations;
DROP POLICY IF EXISTS "Recs update" ON content_recommendations;

CREATE POLICY "cr_select" ON content_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cr_insert" ON content_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cr_update" ON content_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- USER_INTERACTIONS
DROP POLICY IF EXISTS "Interactions insert" ON user_interactions;
DROP POLICY IF EXISTS "Interactions select" ON user_interactions;

CREATE POLICY "ui_select" ON user_interactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ui_insert" ON user_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- CERTIFICATIONS
DROP POLICY IF EXISTS "Certs manage" ON certifications;
DROP POLICY IF EXISTS "Certs select" ON certifications;

CREATE POLICY "certs_select" ON certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "certs_manage" ON certifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- REPORTS
DROP POLICY IF EXISTS "Reports insert" ON reports;
DROP POLICY IF EXISTS "Reports select" ON reports;
DROP POLICY IF EXISTS "Reports update" ON reports;

CREATE POLICY "reports_select" ON reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "reports_insert" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_update" ON reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- ADMIN_LOGS
DROP POLICY IF EXISTS "Admin logs insert" ON admin_logs;
DROP POLICY IF EXISTS "Admin logs select" ON admin_logs;
DROP POLICY IF EXISTS "Only admins can view logs" ON admin_logs;

CREATE POLICY "al_select" ON admin_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "al_insert" ON admin_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- ADMIN_MEDIA
DROP POLICY IF EXISTS "Admin media manage" ON admin_media;
DROP POLICY IF EXISTS "Admin media select" ON admin_media;

CREATE POLICY "am_select" ON admin_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "am_manage" ON admin_media FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- TRANSLATIONS
DROP POLICY IF EXISTS "Translations manage" ON translations;
DROP POLICY IF EXISTS "Translations select" ON translations;

CREATE POLICY "trans_select" ON translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "trans_manage" ON translations FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- USER_ROLES
DROP POLICY IF EXISTS "Roles manage" ON user_roles;
DROP POLICY IF EXISTS "Roles select own" ON user_roles;

CREATE POLICY "ur_select" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ur_manage" ON user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
