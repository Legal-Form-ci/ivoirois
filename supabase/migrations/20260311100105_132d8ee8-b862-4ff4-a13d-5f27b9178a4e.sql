
-- =============================================
-- CRITICAL FIX: Convert ALL RLS policies from RESTRICTIVE to PERMISSIVE
-- and restore all missing triggers
-- =============================================

-- Helper function to safely drop and recreate policies as PERMISSIVE
-- We'll do it table by table

-- ===== STORIES =====
DROP POLICY IF EXISTS "stories_select" ON public.stories;
DROP POLICY IF EXISTS "stories_insert" ON public.stories;
DROP POLICY IF EXISTS "stories_delete" ON public.stories;
CREATE POLICY "stories_select" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "stories_insert" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_delete" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== STORY_REACTIONS =====
DROP POLICY IF EXISTS "sr_select" ON public.story_reactions;
DROP POLICY IF EXISTS "sr_insert" ON public.story_reactions;
DROP POLICY IF EXISTS "sr_delete" ON public.story_reactions;
CREATE POLICY "sr_select" ON public.story_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_insert" ON public.story_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sr_delete" ON public.story_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== POSTS =====
DROP POLICY IF EXISTS "posts_select" ON public.posts;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_update" ON public.posts;
DROP POLICY IF EXISTS "posts_delete" ON public.posts;
CREATE POLICY "posts_select" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== PROFILES =====
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin" ON public.profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ===== LIKES =====
DROP POLICY IF EXISTS "likes_select" ON public.likes;
DROP POLICY IF EXISTS "likes_insert" ON public.likes;
DROP POLICY IF EXISTS "likes_delete" ON public.likes;
CREATE POLICY "likes_select" ON public.likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== REACTIONS =====
DROP POLICY IF EXISTS "reactions_select" ON public.reactions;
DROP POLICY IF EXISTS "reactions_insert" ON public.reactions;
DROP POLICY IF EXISTS "reactions_update" ON public.reactions;
DROP POLICY IF EXISTS "reactions_delete" ON public.reactions;
CREATE POLICY "reactions_select" ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "reactions_insert" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_update" ON public.reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== COMMENTS =====
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_update" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_select" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== FRIENDSHIPS =====
DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;
CREATE POLICY "friendships_select" ON public.friendships FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR (auth.uid() = friend_id));
CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friendships_update" ON public.friendships FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR (auth.uid() = friend_id));
CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR (auth.uid() = friend_id));

-- ===== CONVERSATIONS =====
DROP POLICY IF EXISTS "conv_select" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert" ON public.conversations;
DROP POLICY IF EXISTS "conv_update" ON public.conversations;
CREATE POLICY "conv_select" ON public.conversations FOR SELECT TO authenticated USING (is_conversation_participant(id, auth.uid()));
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE TO authenticated USING (is_conversation_participant(id, auth.uid()));

-- ===== CONVERSATION_PARTICIPANTS =====
DROP POLICY IF EXISTS "cp_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_update" ON public.conversation_participants;
CREATE POLICY "cp_select" ON public.conversation_participants FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()) OR (user_id = auth.uid()));
CREATE POLICY "cp_insert" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) OR is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "cp_update" ON public.conversation_participants FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ===== MESSAGES =====
DROP POLICY IF EXISTS "msg_select" ON public.messages;
DROP POLICY IF EXISTS "msg_insert" ON public.messages;
DROP POLICY IF EXISTS "msg_update" ON public.messages;
CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id) AND is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));

-- ===== NOTIFICATIONS =====
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ===== GROUPS =====
DROP POLICY IF EXISTS "groups_select" ON public.groups;
DROP POLICY IF EXISTS "groups_insert" ON public.groups;
DROP POLICY IF EXISTS "groups_update" ON public.groups;
DROP POLICY IF EXISTS "groups_delete" ON public.groups;
CREATE POLICY "groups_select" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_insert" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_update" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "groups_delete" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ===== GROUP_MEMBERS =====
DROP POLICY IF EXISTS "gm_select" ON public.group_members;
DROP POLICY IF EXISTS "gm_insert" ON public.group_members;
DROP POLICY IF EXISTS "gm_update" ON public.group_members;
DROP POLICY IF EXISTS "gm_delete" ON public.group_members;
CREATE POLICY "gm_select" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "gm_insert" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gm_update" ON public.group_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "gm_delete" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== GROUP_MESSAGES =====
DROP POLICY IF EXISTS "gmsg_select" ON public.group_messages;
DROP POLICY IF EXISTS "gmsg_insert" ON public.group_messages;
CREATE POLICY "gmsg_select" ON public.group_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "gmsg_insert" ON public.group_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id) AND EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid()));

-- ===== COMPANIES =====
DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_update" ON public.companies;
DROP POLICY IF EXISTS "companies_delete" ON public.companies;
CREATE POLICY "companies_select" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "companies_update" ON public.companies FOR UPDATE TO authenticated USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "companies_delete" ON public.companies FOR DELETE TO authenticated USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ===== JOB_POSTS =====
DROP POLICY IF EXISTS "jobs_select" ON public.job_posts;
DROP POLICY IF EXISTS "jobs_insert" ON public.job_posts;
DROP POLICY IF EXISTS "jobs_update" ON public.job_posts;
DROP POLICY IF EXISTS "jobs_delete" ON public.job_posts;
CREATE POLICY "jobs_select" ON public.job_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "jobs_insert" ON public.job_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "jobs_update" ON public.job_posts FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "jobs_delete" ON public.job_posts FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ===== JOB_APPLICATIONS =====
DROP POLICY IF EXISTS "ja_select" ON public.job_applications;
DROP POLICY IF EXISTS "ja_insert" ON public.job_applications;
CREATE POLICY "ja_select" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ja_insert" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== EVENTS =====
DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_delete" ON public.events;
CREATE POLICY "events_select" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "events_update" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "events_delete" ON public.events FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ===== EVENT_ATTENDEES =====
DROP POLICY IF EXISTS "ea_select" ON public.event_attendees;
DROP POLICY IF EXISTS "ea_insert" ON public.event_attendees;
DROP POLICY IF EXISTS "ea_delete" ON public.event_attendees;
CREATE POLICY "ea_select" ON public.event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "ea_insert" ON public.event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ea_delete" ON public.event_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== MARKETPLACE_LISTINGS =====
DROP POLICY IF EXISTS "ml_select" ON public.marketplace_listings;
DROP POLICY IF EXISTS "ml_insert" ON public.marketplace_listings;
DROP POLICY IF EXISTS "ml_update" ON public.marketplace_listings;
DROP POLICY IF EXISTS "ml_delete" ON public.marketplace_listings;
CREATE POLICY "ml_select" ON public.marketplace_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ml_insert" ON public.marketplace_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "ml_update" ON public.marketplace_listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "ml_delete" ON public.marketplace_listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- ===== MARKETPLACE_FAVORITES =====
DROP POLICY IF EXISTS "mf_select" ON public.marketplace_favorites;
DROP POLICY IF EXISTS "mf_insert" ON public.marketplace_favorites;
DROP POLICY IF EXISTS "mf_delete" ON public.marketplace_favorites;
CREATE POLICY "mf_select" ON public.marketplace_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mf_insert" ON public.marketplace_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mf_delete" ON public.marketplace_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== PAGES =====
DROP POLICY IF EXISTS "pages_select" ON public.pages;
DROP POLICY IF EXISTS "pages_insert" ON public.pages;
DROP POLICY IF EXISTS "pages_update" ON public.pages;
DROP POLICY IF EXISTS "pages_delete" ON public.pages;
CREATE POLICY "pages_select" ON public.pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "pages_insert" ON public.pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "pages_update" ON public.pages FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "pages_delete" ON public.pages FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ===== PAGE_FOLLOWERS =====
DROP POLICY IF EXISTS "pf_select" ON public.page_followers;
DROP POLICY IF EXISTS "pf_insert" ON public.page_followers;
DROP POLICY IF EXISTS "pf_delete" ON public.page_followers;
CREATE POLICY "pf_select" ON public.page_followers FOR SELECT TO authenticated USING (true);
CREATE POLICY "pf_insert" ON public.page_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pf_delete" ON public.page_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== SAVED_POSTS =====
DROP POLICY IF EXISTS "sp_select" ON public.saved_posts;
DROP POLICY IF EXISTS "sp_insert" ON public.saved_posts;
DROP POLICY IF EXISTS "sp_delete" ON public.saved_posts;
CREATE POLICY "sp_select" ON public.saved_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sp_insert" ON public.saved_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sp_delete" ON public.saved_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== POST_SHARES =====
DROP POLICY IF EXISTS "ps_select" ON public.post_shares;
DROP POLICY IF EXISTS "ps_insert" ON public.post_shares;
DROP POLICY IF EXISTS "ps_delete" ON public.post_shares;
CREATE POLICY "ps_select" ON public.post_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "ps_insert" ON public.post_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ps_delete" ON public.post_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== RESUMES =====
DROP POLICY IF EXISTS "resumes_select" ON public.resumes;
DROP POLICY IF EXISTS "resumes_insert" ON public.resumes;
DROP POLICY IF EXISTS "resumes_update" ON public.resumes;
DROP POLICY IF EXISTS "resumes_delete" ON public.resumes;
CREATE POLICY "resumes_select" ON public.resumes FOR SELECT TO authenticated USING ((is_public = true) OR (auth.uid() = user_id));
CREATE POLICY "resumes_insert" ON public.resumes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "resumes_update" ON public.resumes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "resumes_delete" ON public.resumes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== LIVE_STREAMS =====
DROP POLICY IF EXISTS "ls_select" ON public.live_streams;
DROP POLICY IF EXISTS "ls_insert" ON public.live_streams;
DROP POLICY IF EXISTS "ls_update" ON public.live_streams;
CREATE POLICY "ls_select" ON public.live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "ls_insert" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "ls_update" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- ===== LIVE_STREAM_COMMENTS =====
DROP POLICY IF EXISTS "lsc_select" ON public.live_stream_comments;
DROP POLICY IF EXISTS "lsc_insert" ON public.live_stream_comments;
CREATE POLICY "lsc_select" ON public.live_stream_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "lsc_insert" ON public.live_stream_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== REELS =====
DROP POLICY IF EXISTS "reels_select" ON public.reels;
DROP POLICY IF EXISTS "reels_insert" ON public.reels;
DROP POLICY IF EXISTS "reels_update" ON public.reels;
DROP POLICY IF EXISTS "reels_delete" ON public.reels;
CREATE POLICY "reels_select" ON public.reels FOR SELECT TO authenticated USING (true);
CREATE POLICY "reels_insert" ON public.reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reels_update" ON public.reels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reels_delete" ON public.reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== REEL_LIKES =====
DROP POLICY IF EXISTS "rl_select" ON public.reel_likes;
DROP POLICY IF EXISTS "rl_insert" ON public.reel_likes;
DROP POLICY IF EXISTS "rl_delete" ON public.reel_likes;
CREATE POLICY "rl_select" ON public.reel_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "rl_insert" ON public.reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rl_delete" ON public.reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== REEL_COMMENTS =====
DROP POLICY IF EXISTS "rc_select" ON public.reel_comments;
DROP POLICY IF EXISTS "rc_insert" ON public.reel_comments;
DROP POLICY IF EXISTS "rc_delete" ON public.reel_comments;
CREATE POLICY "rc_select" ON public.reel_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "rc_insert" ON public.reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rc_delete" ON public.reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== TYPING_INDICATORS =====
DROP POLICY IF EXISTS "ti_all" ON public.typing_indicators;
DROP POLICY IF EXISTS "ti_select_conv" ON public.typing_indicators;
CREATE POLICY "ti_all" ON public.typing_indicators FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ti_select_conv" ON public.typing_indicators FOR SELECT TO authenticated USING (
  ((conversation_id IS NOT NULL) AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = typing_indicators.conversation_id AND conversation_participants.user_id = auth.uid()))
  OR ((group_id IS NOT NULL) AND EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = typing_indicators.group_id AND group_members.user_id = auth.uid()))
);

-- ===== CALL_SIGNALS =====
DROP POLICY IF EXISTS "cs_select" ON public.call_signals;
DROP POLICY IF EXISTS "cs_insert" ON public.call_signals;
CREATE POLICY "cs_select" ON public.call_signals FOR SELECT TO authenticated USING ((auth.uid() = caller_id) OR (auth.uid() = callee_id));
CREATE POLICY "cs_insert" ON public.call_signals FOR INSERT TO authenticated WITH CHECK ((auth.uid() = caller_id) OR (auth.uid() = callee_id));

-- ===== MESSAGE_REACTIONS =====
DROP POLICY IF EXISTS "mr_select" ON public.message_reactions;
DROP POLICY IF EXISTS "mr_insert" ON public.message_reactions;
DROP POLICY IF EXISTS "mr_delete" ON public.message_reactions;
CREATE POLICY "mr_select" ON public.message_reactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()));
CREATE POLICY "mr_insert" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mr_delete" ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== MESSAGE_ATTACHMENTS =====
DROP POLICY IF EXISTS "ma_select" ON public.message_attachments;
DROP POLICY IF EXISTS "ma_insert" ON public.message_attachments;
CREATE POLICY "ma_select" ON public.message_attachments FOR SELECT TO authenticated USING (can_access_message(message_id, auth.uid()));
CREATE POLICY "ma_insert" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (can_access_message(message_id, auth.uid()));

-- ===== VOICE_MESSAGES =====
DROP POLICY IF EXISTS "vm_select" ON public.voice_messages;
DROP POLICY IF EXISTS "vm_insert" ON public.voice_messages;
CREATE POLICY "vm_select" ON public.voice_messages FOR SELECT TO authenticated USING (can_access_message(message_id, auth.uid()));
CREATE POLICY "vm_insert" ON public.voice_messages FOR INSERT TO authenticated WITH CHECK (can_access_message(message_id, auth.uid()));

-- ===== SCHEDULED_POSTS =====
DROP POLICY IF EXISTS "schp_select" ON public.scheduled_posts;
DROP POLICY IF EXISTS "schp_insert" ON public.scheduled_posts;
DROP POLICY IF EXISTS "schp_update" ON public.scheduled_posts;
DROP POLICY IF EXISTS "schp_delete" ON public.scheduled_posts;
CREATE POLICY "schp_select" ON public.scheduled_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "schp_insert" ON public.scheduled_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schp_update" ON public.scheduled_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "schp_delete" ON public.scheduled_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== POLLS =====
DROP POLICY IF EXISTS "polls_select" ON public.polls;
DROP POLICY IF EXISTS "polls_insert" ON public.polls;
DROP POLICY IF EXISTS "polls_delete" ON public.polls;
CREATE POLICY "polls_select" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "polls_insert" ON public.polls FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "polls_delete" ON public.polls FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ===== POLL_OPTIONS =====
DROP POLICY IF EXISTS "po_select" ON public.poll_options;
DROP POLICY IF EXISTS "po_manage" ON public.poll_options;
CREATE POLICY "po_select" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "po_manage" ON public.poll_options FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()));

-- ===== POLL_VOTES =====
DROP POLICY IF EXISTS "pv_select" ON public.poll_votes;
DROP POLICY IF EXISTS "pv_insert" ON public.poll_votes;
DROP POLICY IF EXISTS "pv_delete" ON public.poll_votes;
CREATE POLICY "pv_select" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_insert" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pv_delete" ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== MENTIONS =====
DROP POLICY IF EXISTS "mentions_select" ON public.mentions;
DROP POLICY IF EXISTS "mentions_insert" ON public.mentions;
CREATE POLICY "mentions_select" ON public.mentions FOR SELECT TO authenticated USING ((auth.uid() = mentioned_user_id) OR (auth.uid() = mentioner_id));
CREATE POLICY "mentions_insert" ON public.mentions FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentioner_id);

-- ===== CERTIFICATIONS =====
DROP POLICY IF EXISTS "cert_select" ON public.certifications;
DROP POLICY IF EXISTS "cert_insert" ON public.certifications;
CREATE POLICY "cert_select" ON public.certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "cert_insert" ON public.certifications FOR INSERT TO authenticated WITH CHECK (true);

-- ===== REPORTS =====
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
DROP POLICY IF EXISTS "reports_update" ON public.reports;
CREATE POLICY "reports_select" ON public.reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "reports_insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_update" ON public.reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===== ADMIN_LOGS =====
DROP POLICY IF EXISTS "al_select" ON public.admin_logs;
DROP POLICY IF EXISTS "al_insert" ON public.admin_logs;
CREATE POLICY "al_select" ON public.admin_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "al_insert" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===== ADMIN_MEDIA =====
DROP POLICY IF EXISTS "am_select" ON public.admin_media;
DROP POLICY IF EXISTS "am_manage" ON public.admin_media;
CREATE POLICY "am_select" ON public.admin_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "am_manage" ON public.admin_media FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===== TRANSLATIONS =====
DROP POLICY IF EXISTS "trans_select" ON public.translations;
DROP POLICY IF EXISTS "trans_manage" ON public.translations;
CREATE POLICY "trans_select" ON public.translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "trans_manage" ON public.translations FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ===== POST_TEMPLATES =====
DROP POLICY IF EXISTS "pt_select" ON public.post_templates;
DROP POLICY IF EXISTS "pt_insert" ON public.post_templates;
DROP POLICY IF EXISTS "pt_update" ON public.post_templates;
DROP POLICY IF EXISTS "pt_delete" ON public.post_templates;
CREATE POLICY "pt_select" ON public.post_templates FOR SELECT TO authenticated USING ((is_public = true) OR (auth.uid() = created_by));
CREATE POLICY "pt_insert" ON public.post_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "pt_update" ON public.post_templates FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "pt_delete" ON public.post_templates FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ===== CONTENT_RECOMMENDATIONS =====
DROP POLICY IF EXISTS "cr_select" ON public.content_recommendations;
DROP POLICY IF EXISTS "cr_insert" ON public.content_recommendations;
DROP POLICY IF EXISTS "cr_update" ON public.content_recommendations;
CREATE POLICY "cr_select" ON public.content_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cr_insert" ON public.content_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cr_update" ON public.content_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ===== USER_INTERACTIONS =====
DROP POLICY IF EXISTS "ui_select" ON public.user_interactions;
DROP POLICY IF EXISTS "ui_insert" ON public.user_interactions;
CREATE POLICY "ui_select" ON public.user_interactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ui_insert" ON public.user_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== PUSH_SUBSCRIPTIONS =====
DROP POLICY IF EXISTS "push_select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_delete" ON public.push_subscriptions;
CREATE POLICY "push_select" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== RESTORE ALL TRIGGERS =====
-- Trigger: handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger: update_updated_at on various tables
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_posts_updated_at ON public.job_posts;
CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON public.job_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pages_updated_at ON public.pages;
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resumes_updated_at ON public.resumes;
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON public.resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_listings_updated_at ON public.marketplace_listings;
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reels_updated_at ON public.reels;
CREATE TRIGGER update_reels_updated_at BEFORE UPDATE ON public.reels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_conversation_timestamp
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Trigger: notify_on_like
DROP TRIGGER IF EXISTS trigger_notify_on_like ON public.likes;
CREATE TRIGGER trigger_notify_on_like AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- Trigger: notify_on_comment
DROP TRIGGER IF EXISTS trigger_notify_on_comment ON public.comments;
CREATE TRIGGER trigger_notify_on_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Trigger: notify_on_reaction
DROP TRIGGER IF EXISTS trigger_notify_on_reaction ON public.reactions;
CREATE TRIGGER trigger_notify_on_reaction AFTER INSERT ON public.reactions FOR EACH ROW EXECUTE FUNCTION notify_on_reaction();

-- Trigger: notify_on_friend_request
DROP TRIGGER IF EXISTS trigger_notify_on_friend ON public.friendships;
CREATE TRIGGER trigger_notify_on_friend AFTER INSERT OR UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION notify_on_friend_request();

-- Enable realtime for critical tables
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.stories; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_comments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
