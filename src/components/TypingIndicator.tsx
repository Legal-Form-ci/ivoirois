import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TypingIndicatorProps {
  conversationId?: string;
  groupId?: string;
}

const TypingIndicator = ({ conversationId, groupId }: TypingIndicatorProps) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!conversationId && !groupId) return;

    const channel = supabase
      .channel(`typing-${conversationId || groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: conversationId
            ? `conversation_id=eq.${conversationId}`
            : `group_id=eq.${groupId}`,
        },
        async (payload: any) => {
          if (payload.new && payload.new.user_id !== user?.id) {
            try {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", payload.new.user_id)
                .single();

              if (profile && payload.new.is_typing) {
                setTypingUsers((prev) =>
                  prev.includes(profile.full_name)
                    ? prev
                    : [...prev, profile.full_name]
                );

                setTimeout(() => {
                  setTypingUsers((prev) =>
                    prev.filter((name) => name !== profile.full_name)
                  );
                }, 3000);
              } else if (profile) {
                setTypingUsers((prev) =>
                  prev.filter((name) => name !== profile.full_name)
                );
              }
            } catch (error) {
              console.error("Error fetching typing user profile:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, groupId, user]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="text-sm text-muted-foreground italic px-4 py-2 flex items-center gap-2">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span>
        {typingUsers.length === 1
          ? `${typingUsers[0]} est en train d'écrire...`
          : `${typingUsers.join(", ")} sont en train d'écrire...`}
      </span>
    </div>
  );
};

// Hook to send typing indicator
export const useSendTypingIndicator = (conversationId?: string, groupId?: string) => {
  const { user } = useAuth();

  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!user?.id || (!conversationId && !groupId)) return;

    try {
      // Upsert typing indicator
      await supabase
        .from("typing_indicators")
        .upsert({
          user_id: user.id,
          conversation_id: conversationId || null,
          group_id: groupId || null,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: 'user_id,conversation_id',
        });
    } catch (error) {
      // Ignore errors for typing indicators
      console.debug("Typing indicator error:", error);
    }
  }, [user?.id, conversationId, groupId]);

  return { sendTypingIndicator };
};

export default TypingIndicator;
