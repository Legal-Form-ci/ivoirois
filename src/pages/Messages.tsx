import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import VideoCall from "@/components/VideoCall";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, Phone, Video, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  unread_count?: number;
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
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNewConvo, setShowNewConvo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

            const { count: unreadCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", p.conversation_id)
              .eq("read", false)
              .neq("sender_id", user!.id);

            return {
              id: p.conversations.id,
              updated_at: p.conversations.updated_at,
              other_user: profile,
              last_message: lastMsg?.content,
              unread_count: unreadCount || 0,
            };
          })
        );

        const sorted = convos
          .filter((c) => c && c.other_user)
          .sort((a, b) => new Date(b!.updated_at).getTime() - new Date(a!.updated_at).getTime());
        
        setConversations(sorted as Conversation[]);
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

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId!)
        .neq("sender_id", user!.id);

      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId!)
        .eq("user_id", user!.id);
    } catch (error) {
      toast.error("Erreur lors du chargement des messages");
    }
  };

  const handleTyping = () => {
    if (!conversationId || !user || !otherUser) return;

    // Get user's name
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          sendTypingIndicator(conversationId, data.full_name, user.id);
        }
      });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      console.error("Send message error:", error);
      toast.error("Erreur lors de l'envoi du message");
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .neq("id", user!.id)
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(10);

    setSearchResults(data || []);
  };

  const startConversation = async (targetUserId: string) => {
    // Check if conversation exists
    const { data: existingConvo } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user!.id);

    if (existingConvo) {
      for (const convo of existingConvo) {
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", convo.conversation_id)
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (otherParticipant) {
          setShowNewConvo(false);
          navigate(`/messages/${convo.conversation_id}`);
          return;
        }
      }
    }

    // Create new conversation
    const { data: newConvo, error: convoError } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();

    if (convoError) {
      toast.error("Erreur lors de la création de la conversation");
      return;
    }

    // Add participants
    await supabase.from("conversation_participants").insert([
      { conversation_id: newConvo.id, user_id: user!.id },
      { conversation_id: newConvo.id, user_id: targetUserId },
    ]);

    setShowNewConvo(false);
    fetchConversations();
    navigate(`/messages/${newConvo.id}`);
  };

  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setShowVideoCall(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container py-6 text-center">Chargement...</div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      
      <main className="container py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto h-[calc(100vh-180px)] md:h-[calc(100vh-150px)]">
          {/* Conversations list - hidden on mobile when in conversation */}
          <Card className={`md:col-span-1 flex flex-col ${conversationId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Messages</h2>
                <Dialog open={showNewConvo} onOpenChange={setShowNewConvo}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvelle conversation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                      />
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {searchResults.map((result) => (
                            <Button
                              key={result.id}
                              variant="ghost"
                              className="w-full justify-start gap-3"
                              onClick={() => startConversation(result.id)}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={result.avatar_url} />
                                <AvatarFallback>{result.full_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{result.full_name}</span>
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 px-4">
                  Aucune conversation. Commencez à discuter !
                </p>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map((conv) => (
                    <Button
                      key={conv.id}
                      variant={conversationId === conv.id ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 h-auto py-3 px-3"
                      onClick={() => navigate(`/messages/${conv.id}`)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.other_user.avatar_url} />
                          <AvatarFallback>
                            {conv.other_user.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus 
                          userId={conv.other_user.id} 
                          className="absolute -bottom-0.5 -right-0.5"
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{conv.other_user.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate" dangerouslySetInnerHTML={{ 
                          __html: conv.last_message?.replace(/<[^>]*>/g, '').slice(0, 30) || "Nouvelle conversation" 
                        }} />
                      </div>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat area */}
          <Card className={`md:col-span-2 flex flex-col ${!conversationId ? 'hidden md:flex' : 'flex'}`}>
            {conversationId ? (
              <>
                <div className="p-3 md:p-4 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden flex-shrink-0"
                    onClick={() => navigate("/messages")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  {otherUser && (
                    <>
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherUser.avatar_url} />
                          <AvatarFallback>
                            {otherUser.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineStatus 
                          userId={otherUser.id}
                          className="absolute -bottom-0.5 -right-0.5"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{otherUser.full_name}</p>
                        <OnlineStatus userId={otherUser.id} showText className="text-xs" />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startCall('audio')}>
                          <Phone className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startCall('video')}>
                          <Video className="h-5 w-5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <ScrollArea className="flex-1 p-4">
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
                          className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2 ${
                            msg.sender_id === user?.id
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          }`}
                        >
                          <div 
                            className="prose prose-sm max-w-none break-words [&_p]:m-0" 
                            dangerouslySetInnerHTML={{ __html: msg.content }} 
                          />
                          <p className={`text-xs mt-1 ${
                            msg.sender_id === user?.id 
                              ? "text-primary-foreground/70" 
                              : "text-muted-foreground"
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {conversationId && (
                  <TypingIndicator conversationId={conversationId} className="px-4" />
                )}

                <form onSubmit={sendMessage} className="p-3 md:p-4 border-t space-y-2">
                  <RichTextEditor
                    content={newMessage}
                    onChange={(value) => {
                      setNewMessage(value);
                      handleTyping();
                    }}
                    placeholder="Écrivez un message..."
                    minHeight="60px"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation pour commencer</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Video Call Modal */}
      {showVideoCall && otherUser && (
        <VideoCall
          isOpen={showVideoCall}
          onClose={() => setShowVideoCall(false)}
          remoteUser={otherUser}
          isVideoCall={callType === 'video'}
        />
      )}
      
      <MobileNav />
    </div>
  );
};

export default Messages;
