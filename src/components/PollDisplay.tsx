import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart3, Check, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PollOption {
  id: string;
  option_text: string;
  position: number;
  vote_count: number;
}

interface Poll {
  id: string;
  question: string;
  ends_at: string;
  is_multiple_choice: boolean;
  options: PollOption[];
  total_votes: number;
  user_votes: string[];
  is_ended: boolean;
}

interface PollDisplayProps {
  pollId: string;
}

const PollDisplay = ({ pollId }: PollDisplayProps) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    fetchPoll();

    // Subscribe to vote changes
    const channel = supabase
      .channel(`poll-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `poll_id=eq.${pollId}`,
        },
        () => fetchPoll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId]);

  const fetchPoll = async () => {
    try {
      const { data: pollData } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (!pollData) return;

      const { data: optionsData } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', pollId)
        .order('position');

      const { data: votesData } = await supabase
        .from('poll_votes')
        .select('option_id, user_id')
        .eq('poll_id', pollId);

      const isEnded = new Date(pollData.ends_at) < new Date();

      // Count votes per option
      const voteCounts: Record<string, number> = {};
      const userVotes: string[] = [];

      votesData?.forEach((vote: any) => {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
        if (vote.user_id === user?.id) {
          userVotes.push(vote.option_id);
        }
      });

      const options = optionsData?.map((opt: any) => ({
        ...opt,
        vote_count: voteCounts[opt.id] || 0,
      })) || [];

      const totalVotes = votesData?.length || 0;

      setPoll({
        ...pollData,
        options,
        total_votes: totalVotes,
        user_votes: userVotes,
        is_ended: isEnded,
      });
    } catch (error) {
      console.error('Error fetching poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!user) {
      toast.error('Connectez-vous pour voter');
      return;
    }

    if (!poll || poll.is_ended) return;

    setVoting(true);

    try {
      const hasVoted = poll.user_votes.includes(optionId);

      if (hasVoted) {
        // Remove vote
        await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('option_id', optionId)
          .eq('user_id', user.id);
      } else {
        // Add vote (remove previous if not multiple choice)
        if (!poll.is_multiple_choice && poll.user_votes.length > 0) {
          await supabase
            .from('poll_votes')
            .delete()
            .eq('poll_id', pollId)
            .eq('user_id', user.id);
        }

        await supabase
          .from('poll_votes')
          .insert({
            poll_id: pollId,
            option_id: optionId,
            user_id: user.id,
          });
      }

      fetchPoll();
    } catch (error) {
      console.error('Vote error:', error);
      toast.error('Erreur lors du vote');
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!poll) return null;

  const hasVoted = poll.user_votes.length > 0;
  const showResults = hasVoted || poll.is_ended;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {poll.question}
          </h4>
        </div>

        <div className="space-y-2">
          {poll.options.map((option) => {
            const percentage = poll.total_votes > 0 
              ? Math.round((option.vote_count / poll.total_votes) * 100) 
              : 0;
            const isSelected = poll.user_votes.includes(option.id);

            return (
              <button
                key={option.id}
                onClick={() => !poll.is_ended && handleVote(option.id)}
                disabled={voting || poll.is_ended}
                className={`w-full text-left relative rounded-lg border p-3 transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                } ${poll.is_ended ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {showResults && (
                  <Progress 
                    value={percentage} 
                    className="absolute inset-0 h-full rounded-lg opacity-20"
                  />
                )}
                <div className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <span className={isSelected ? 'font-medium' : ''}>
                      {option.option_text}
                    </span>
                  </span>
                  {showResults && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {percentage}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {poll.is_ended ? (
                'Terminé'
              ) : (
                `Termine ${formatDistanceToNow(new Date(poll.ends_at), { locale: fr, addSuffix: true })}`
              )}
            </span>
          </div>
        </div>

        {poll.is_multiple_choice && !poll.is_ended && (
          <p className="text-xs text-muted-foreground text-center">
            Plusieurs choix possibles
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PollDisplay;
