-- Add typing indicators table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT typing_indicator_context CHECK (
    (conversation_id IS NOT NULL AND group_id IS NULL) OR
    (conversation_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view typing in their conversations"
ON public.typing_indicators FOR SELECT
USING (
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = typing_indicators.conversation_id 
    AND user_id = auth.uid()
  )) OR
  (group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = typing_indicators.group_id 
    AND user_id = auth.uid()
  ))
);

CREATE POLICY "Users can manage their own typing status"
ON public.typing_indicators FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add online status columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add read receipts to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON public.typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_group ON public.typing_indicators(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON public.profiles(is_online);