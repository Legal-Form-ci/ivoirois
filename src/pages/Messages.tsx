import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  last_message?: string;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (conversationId && user) {
      fetchMessages();
      
      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user]);

  const fetchConversations = async () => {
    try {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations(id, updated_at)
        `)
        .eq("user_id", user!.id);

      if (participants) {
        const convos = await Promise.all(
          participants.map(async (p: any) => {
            const { data: otherParticipants } = await supabase
              .from("conversation_participants")
              .select("user_id")
              .eq("conversation_id", p.conversation_id)
              .neq("user_id", user!.id);

            if (!otherParticipants || otherParticipants.length === 0) return null;

            const { data: profile } = await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .eq("id", otherParticipants[0].user_id)
              .single();

            const { data: lastMsg } = await supabase
              .from("messages")
              .select("content")
              .eq("conversation_id", p.conversation_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              id: p.conversations.id,
              updated_at: p.conversations.updated_at,
              other_user: profile,
              last_message: lastMsg?.content,
            };
          })
        );

        setConversations(convos.filter((c) => c && c.other_user) as Conversation[]);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });

      setMessages(data || []);

      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId!)
        .neq("user_id", user!.id);

      if (otherParticipants && otherParticipants.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .eq("id", otherParticipants[0].user_id)
          .single();

        setOtherUser(profile);
      }

      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId!)
        .eq("user_id", user!.id);
    } catch (error) {
      toast.error("Erreur lors du chargement des messages");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    try {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content: newMessage.trim(),
      });

      setNewMessage("");
    } catch (error) {
      toast.error("Erreur lors de l'envoi du message");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container py-6 text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
          <Card className="md:col-span-1 p-4">
            <h2 className="text-xl font-semibold mb-4">Conversations</h2>
            <ScrollArea className="h-[calc(100vh-250px)]">
              {conversations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune conversation
                </p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <Button
                      key={conv.id}
                      variant={conversationId === conv.id ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => navigate(`/messages/${conv.id}`)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.other_user.avatar_url} />
                        <AvatarFallback>
                          {conv.other_user.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{conv.other_user.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message || "Nouvelle conversation"}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          <Card className="md:col-span-2 flex flex-col">
            {conversationId ? (
              <>
                <div className="p-4 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => navigate("/messages")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  {otherUser && (
                    <>
                      <Avatar>
                        <AvatarImage src={otherUser.avatar_url} />
                        <AvatarFallback>
                          {otherUser.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{otherUser.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          @{otherUser.username}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <ScrollArea className="flex-1 p-4 h-[calc(100vh-350px)]">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_id === user?.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            msg.sender_id === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.content }} />
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <form onSubmit={sendMessage} className="p-4 border-t space-y-2">
                  <RichTextEditor
                    content={newMessage}
                    onChange={setNewMessage}
                    placeholder="Écrivez un message..."
                    minHeight="80px"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Sélectionnez une conversation pour commencer
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;
