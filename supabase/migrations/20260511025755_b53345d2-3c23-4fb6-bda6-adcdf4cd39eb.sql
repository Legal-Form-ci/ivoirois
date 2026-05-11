
-- LIVE STREAMS: restrict public select to actually-public streams
DROP POLICY IF EXISTS ls_select_public ON public.live_streams;
CREATE POLICY ls_select_public ON public.live_streams
  FOR SELECT
  TO authenticated
  USING (privacy = 'public' OR auth.uid() = host_id);

-- LIVE STREAM COMMENTS: tighten select + add update/delete
DROP POLICY IF EXISTS lsc_select ON public.live_stream_comments;
CREATE POLICY lsc_select ON public.live_stream_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = live_stream_comments.stream_id
        AND (ls.privacy = 'public' OR ls.host_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS lsc_update ON public.live_stream_comments;
CREATE POLICY lsc_update ON public.live_stream_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS lsc_delete ON public.live_stream_comments;
CREATE POLICY lsc_delete ON public.live_stream_comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = live_stream_comments.stream_id AND ls.host_id = auth.uid()
    )
  );
