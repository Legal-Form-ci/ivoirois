import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";

interface MessageReactionsProps {
  messageId: string;
  showPicker?: boolean;
}

const REACTIONS = [
  { emoji: "👍", type: "like" },
  { emoji: "❤️", type: "love" },
  { emoji: "😂", type: "laugh" },
  { emoji: "😮", type: "wow" },
  { emoji: "😢", type: "sad" },
  { emoji: "🙏", type: "pray" },
];

interface Reaction {
  id: string;
  reaction_type: string;
  user_id: string;
}

const MessageReactions = ({ messageId, showPicker = true }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    try {
      const { data } = await supabase
        .from("message_reactions" as any)
        .select("*")
        .eq("message_id", messageId);

      if (data) setReactions(data as unknown as Reaction[]);
    } catch (error) {
      console.error("Error fetching reactions:", error);
    }
  };

  const toggleReaction = async (reactionType: string) => {
    if (!user) return;

    const existingReaction = reactions.find(
      (r) => r.user_id === user.id && r.reaction_type === reactionType
    );

    if (existingReaction) {
      await supabase
        .from("message_reactions" as any)
        .delete()
        .eq("id", existingReaction.id);
    } else {
      // Remove any existing reaction from this user first
      await supabase
        .from("message_reactions" as any)
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id);

      // Add new reaction
      await supabase.from("message_reactions" as any).insert({
        message_id: messageId,
        user_id: user.id,
        reaction_type: reactionType,
      });
    }

    setIsOpen(false);
  };

  const getReactionCounts = () => {
    const counts: Record<string, number> = {};
    reactions.forEach((r) => {
      counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
    });
    return counts;
  };

  const myReaction = reactions.find((r) => r.user_id === user?.id);
  const reactionCounts = getReactionCounts();

  return (
    <div className="flex items-center gap-1">
      {/* Display existing reactions */}
      {Object.entries(reactionCounts).length > 0 && (
        <div className="flex items-center gap-0.5 bg-muted/80 rounded-full px-1.5 py-0.5">
          {Object.entries(reactionCounts).map(([type, count]) => {
            const reaction = REACTIONS.find((r) => r.type === type);
            return (
              <button
                key={type}
                onClick={() => toggleReaction(type)}
                className={`text-xs hover:scale-110 transition-transform ${
                  myReaction?.reaction_type === type ? "scale-110" : ""
                }`}
              >
                {reaction?.emoji}
                {count > 1 && <span className="text-[10px] ml-0.5">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Reaction picker */}
      {showPicker && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Smile className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="flex gap-1">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction.type}
                  onClick={() => toggleReaction(reaction.type)}
                  className={`text-xl p-1.5 rounded-full hover:bg-muted transition-colors ${
                    myReaction?.reaction_type === reaction.type
                      ? "bg-primary/20"
                      : ""
                  }`}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default MessageReactions;
