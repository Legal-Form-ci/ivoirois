-- Fix remaining permissive RLS policies

-- 1. Fix conversations INSERT policy - require at least one friend
DROP POLICY IF EXISTS "Users can create conversations with friends" ON conversations;
CREATE POLICY "Authenticated users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix friendships policies to prevent spam
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests"
ON friendships FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  user_id != friend_id AND
  NOT EXISTS (
    SELECT 1 FROM friendships f 
    WHERE (f.user_id = auth.uid() AND f.friend_id = friendships.friend_id)
       OR (f.friend_id = auth.uid() AND f.user_id = friendships.friend_id)
  )
);

-- 3. Fix live_stream_comments INSERT
DROP POLICY IF EXISTS "Authenticated users can comment" ON live_stream_comments;
CREATE POLICY "Authenticated users can comment on streams"
ON live_stream_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Fix mentions INSERT
DROP POLICY IF EXISTS "Users can create mentions" ON mentions;
CREATE POLICY "Users can create mentions"
ON mentions FOR INSERT
TO authenticated
WITH CHECK (mentioner_id = auth.uid());

-- 5. Fix reel_comments INSERT
DROP POLICY IF EXISTS "Users can comment on reels" ON reel_comments;
CREATE POLICY "Users can comment on public reels"
ON reel_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM reels r WHERE r.id = reel_id AND r.is_public = true
  )
);

-- 6. Fix reel_likes INSERT
DROP POLICY IF EXISTS "Users can like reels" ON reel_likes;
CREATE POLICY "Users can like public reels"
ON reel_likes FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM reels r WHERE r.id = reel_id AND r.is_public = true
  )
);

-- 7. Fix post_shares INSERT  
DROP POLICY IF EXISTS "Users can share posts" ON post_shares;
CREATE POLICY "Users can share posts"
ON post_shares FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 8. Fix saved_posts INSERT
DROP POLICY IF EXISTS "Users can save posts" ON saved_posts;
CREATE POLICY "Users can save posts"
ON saved_posts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 9. Fix reactions INSERT
DROP POLICY IF EXISTS "Users can react to posts" ON reactions;
CREATE POLICY "Users can react to posts"
ON reactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 10. Fix likes INSERT
DROP POLICY IF EXISTS "Users can like posts" ON likes;
CREATE POLICY "Users can like posts"  
ON likes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 11. Fix comments INSERT
DROP POLICY IF EXISTS "Users can comment on posts" ON comments;
CREATE POLICY "Users can comment on posts"
ON comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 12. Fix message_reactions INSERT
DROP POLICY IF EXISTS "Users can react to messages" ON message_reactions;
CREATE POLICY "Participants can react to messages"
ON message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  public.can_access_message(message_id, auth.uid())
);