import { useEffect, useState } from "react";
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
    <div className="text-sm text-muted-foreground italic px-4 py-2">
      {typingUsers.length === 1
        ? `${typingUsers[0]} est en train d'écrire...`
        : `${typingUsers.join(", ")} sont en train d'écrire...`}
    </div>
  );
};

export default TypingIndicator;
