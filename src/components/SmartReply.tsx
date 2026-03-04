import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface SmartReplyProps {
  messages: Array<{ sender: string; content: string }>;
  onSelectReply: (reply: string) => void;
}

const SmartReply = ({ messages, onSelectReply }: SmartReplyProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  useEffect(() => {
    // Only auto-generate when new messages arrive
    if (messages.length > 0 && messages.length !== lastMessageCount) {
      setLastMessageCount(messages.length);
      // Only suggest if the last message is not from the current user
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender !== "me") {
        generateSuggestions();
      }
    }
  }, [messages.length]);

  const generateSuggestions = async () => {
    if (messages.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-smart-reply", {
        body: {
          messages: messages.slice(-5),
          context: "conversation sur un réseau social professionnel",
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error("Smart reply error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Suggestions IA...</span>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
      <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
      {suggestions.map((suggestion, i) => (
        <Button
          key={i}
          variant="outline"
          size="sm"
          className="text-xs whitespace-nowrap flex-shrink-0 h-7 px-3 rounded-full"
          onClick={() => {
            onSelectReply(suggestion);
            setSuggestions([]);
          }}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
};

export default SmartReply;
