
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS recording_enabled boolean NOT NULL DEFAULT true;

-- Storage policies for the recordings bucket (bucket created via tool separately).
-- Path convention: <stream_id>/<filename>
DROP POLICY IF EXISTS "recordings_host_insert" ON storage.objects;
CREATE POLICY "recordings_host_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND ls.host_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "recordings_host_update" ON storage.objects;
CREATE POLICY "recordings_host_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND ls.host_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "recordings_host_delete" ON storage.objects;
CREATE POLICY "recordings_host_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND ls.host_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "recordings_read" ON storage.objects;
CREATE POLICY "recordings_read" ON storage.objects
FOR SELECT TO authenticated, anon
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 FROM public.live_streams ls
    WHERE ls.id::text = split_part(name, '/', 1)
      AND (ls.privacy = 'public' OR ls.host_id = auth.uid())
  )
);
