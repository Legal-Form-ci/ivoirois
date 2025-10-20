import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ReactionPickerProps {
  postId: string;
  onReactionChange?: () => void;
}

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'J\'aime' },
  { type: 'love', emoji: '❤️', label: 'J\'adore' },
  { type: 'smile', emoji: '😊', label: 'Sourire' },
  { type: 'wow', emoji: '😮', label: 'Impressionnant' },
  { type: 'sad', emoji: '😔', label: 'Triste' },
  { type: 'cry', emoji: '😭', label: 'Pleurer' },
  { type: 'angry', emoji: '😠', label: 'En colère' },
  { type: 'dislike', emoji: '👎', label: 'N\'aime pas' },
];

const ReactionPicker = ({ postId, onReactionChange }: ReactionPickerProps) => {
  const { user } = useAuth();
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCurrentReaction();
      fetchReactionCounts();
    }
  }, [postId, user]);

  const fetchCurrentReaction = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('reactions' as any)
        .select('reaction_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      setCurrentReaction((data as any)?.reaction_type || null);
    } catch (error) {
      console.error('Error fetching reaction:', error);
    }
  };

  const fetchReactionCounts = async () => {
    try {
      const { data } = await supabase
        .from('reactions' as any)
        .select('reaction_type')
        .eq('post_id', postId);

      const counts: Record<string, number> = {};
      data?.forEach((r: any) => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      setReactionCounts(counts);
    } catch (error) {
      console.error('Error fetching reaction counts:', error);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      if (currentReaction === reactionType) {
        await supabase
          .from('reactions' as any)
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        setCurrentReaction(null);
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
        }));
      } else {
        if (currentReaction) {
          await supabase
            .from('reactions' as any)
            .update({ reaction_type: reactionType })
            .eq('post_id', postId)
            .eq('user_id', user.id);
          
          setReactionCounts(prev => ({
            ...prev,
            [currentReaction]: Math.max(0, (prev[currentReaction] || 0) - 1),
            [reactionType]: (prev[reactionType] || 0) + 1
          }));
        } else {
          await supabase
            .from('reactions' as any)
            .insert({
              post_id: postId,
              user_id: user.id,
              reaction_type: reactionType
            });
          
          setReactionCounts(prev => ({
            ...prev,
            [reactionType]: (prev[reactionType] || 0) + 1
          }));
        }
        
        setCurrentReaction(reactionType);
      }
      
      setOpen(false);
      onReactionChange?.();
    } catch (error: any) {
      toast.error('Erreur lors de la réaction');
    }
  };

  const currentReactionData = REACTIONS.find(r => r.type === currentReaction);
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
          >
            <span className="text-xl">{currentReactionData?.emoji || '👍'}</span>
            <span className="text-sm">{totalReactions > 0 ? totalReactions : ''}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex gap-1">
            {REACTIONS.map((reaction) => (
              <Button
                key={reaction.type}
                variant="ghost"
                size="sm"
                className="text-2xl p-2 h-auto hover:scale-125 transition-transform"
                onClick={() => handleReaction(reaction.type)}
                title={reaction.label}
              >
                {reaction.emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      {Object.entries(reactionCounts).filter(([_, count]) => count > 0).length > 0 && (
        <div className="flex gap-1 text-xs">
          {Object.entries(reactionCounts)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type, count]) => (
              <span key={type} className="flex items-center gap-1">
                {REACTIONS.find(r => r.type === type)?.emoji} {count}
              </span>
            ))}
        </div>
      )}
    </div>
  );
};

export default ReactionPicker;
