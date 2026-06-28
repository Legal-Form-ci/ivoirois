-- Backfill legacy voice-message rows from old HTML message content
INSERT INTO public.voice_messages (message_id, audio_url, duration, created_at)
SELECT
  m.id,
  regexp_replace(
    (regexp_match(m.content, '/object/sign/messages/([^?"''<> ]+)'))[1],
    '%2F', '/', 'g'
  ) AS audio_url,
  COALESCE(((regexp_match(m.content, '🎤\s*([0-9]+)s'))[1])::integer, NULL) AS duration,
  m.created_at
FROM public.messages m
WHERE m.content LIKE '%voice-message%'
  AND m.content LIKE '%/object/sign/messages/%'
  AND NOT EXISTS (SELECT 1 FROM public.voice_messages vm WHERE vm.message_id = m.id);
