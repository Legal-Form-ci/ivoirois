import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStorageUrl } from "@/lib/storage";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import WebRTCCall from "@/components/WebRTCCall";
import OnlineStatus from "@/components/OnlineStatus";
import { sanitizeHtml } from "@/lib/sanitize";
import TypingIndicator, { useSendTypingIndicator } from "@/components/TypingIndicator";
import MessageReactions from "@/components/MessageReactions";
import ScheduledMessaging from "@/components/ScheduledMessaging";
import VoiceRecorder from "@/components/VoiceRecorder";
import SmartReply from "@/components/SmartReply";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, Phone, Video, Search, Plus, Check, CheckCheck, Loader2, Lock, Unlock, TimerReset, ShieldCheck, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { conversationPrivacySchema, messageSchema } from "@/lib/validation";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  delivered_at?: string;
  read_at?: string;
  voice_messages?: Array<{
    id: string;
    audio_url: string;
    duration?: number | null;
    transcription?: string | null;
    transcription_status?: string | null;
    transcription_error?: string | null;
  }>;
  expires_at?: string | null;
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

interface OwnParticipantSettings {
  is_locked: boolean;
  locked_at?: string | null;
  ephemeral_enabled: boolean;
  ephemeral_ttl_seconds: number;
}

type VoiceUiState = {
  status: "loading" | "ready" | "error" | "transcribing";
  error?: string;
};

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
  const [voiceUrls, setVoiceUrls] = useState<Record<string, string>>({});
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceUiState>>({});
  const [ownSettings, setOwnSettings] = useState<OwnParticipantSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { sendTypingIndicator } = useSendTypingIndicator(conversationId);

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
            const incoming = payload.new as Message;
            setMessages((prev) => [...prev, incoming]);
            if (incoming.content?.includes('voice-message') || incoming.content?.includes('data-voice-path')) {
              window.setTimeout(() => fetchMessages(), 900);
            }
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

  useEffect(() => {
    resolveVoiceUrls(messages);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const extractVoicePathFromContent = (content: string) => {
    if (!content) return null;
    const signedMatch = content.match(/\/object\/sign\/messages\/([^?"'<>\s]+)/);
    if (signedMatch?.[1]) return decodeURIComponent(signedMatch[1]);
    const publicMatch = content.match(/\/object\/public\/messages\/([^?"'<>\s]+)/);
    if (publicMatch?.[1]) return decodeURIComponent(publicMatch[1]);
    const dataPathMatch = content.match(/data-voice-path=["']([^"']+)["']/);
    if (dataPathMatch?.[1]) return dataPathMatch[1];
    return null;
  };

  const getVoiceMeta = (msg: Message) => {
    const voice = msg.voice_messages?.[0];
    const path = voice?.audio_url || extractVoicePathFromContent(msg.content);
    if (!path) return null;
    return {
      path,
      duration: voice?.duration ?? null,
      transcription: voice?.transcription ?? null,
      transcription_status: voice?.transcription_status ?? null,
      transcription_error: voice?.transcription_error ?? null,
      voiceId: voice?.id ?? null,
    };
  };

  const withRetry = async <T,>(operation: () => Promise<T>, attempts = 3, delay = 450): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await new Promise((resolve) => window.setTimeout(resolve, delay * attempt));
        }
      }
    }
    throw lastError;
  };

  const getVoicePreview = (msg: Message) => {
    const meta = getVoiceMeta(msg);
    if (!meta) return "Message vocal";
    if (meta.transcription?.trim()) return meta.transcription.trim();
    if (meta.transcription_status === "error") return "Transcription indisponible";
    if (meta.transcription_status === "pending") return "Prévisualisation en attente…";
    if (meta.transcription_status === "processing") return "Transcription en cours…";
    return `Message vocal${meta.duration ? ` de ${Math.round(meta.duration)} secondes` : ""}`;
  };

  const resolveVoiceUrls = async (items: Message[]) => {
    const missing = items
      .map((msg) => ({ id: msg.id, meta: getVoiceMeta(msg) }))
      .filter((item): item is { id: string; meta: NonNullable<ReturnType<typeof getVoiceMeta>> } => !!item.meta && !voiceUrls[item.id]);

    if (missing.length === 0) return;

    setVoiceStates((prev) => ({
      ...prev,
      ...Object.fromEntries(missing.map(({ id }) => [id, { status: "loading" as const }])),
    }));

    const resolved = await Promise.all(
      missing.map(async ({ id, meta }) => {
        try {
          const url = await withRetry(() => getStorageUrl('messages', meta.path), 3, 500);
          return [id, url, null] as const;
        } catch (error: any) {
          return [id, null, error?.message || "Fichier vocal inaccessible"] as const;
        }
      })
    );

    setVoiceUrls((prev) => ({
      ...prev,
      ...Object.fromEntries(resolved.filter(([, url]) => !!url).map(([id, url]) => [id, url])),
    }));
    setVoiceStates((prev) => ({
      ...prev,
      ...Object.fromEntries(
        resolved.map(([id, url, error]) => [
          id,
          url ? { status: "ready" as const } : { status: "error" as const, error: error || "Chargement impossible" },
        ])
      ),
    }));
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
        .select("*, voice_messages(id, audio_url, duration, transcription, transcription_status, transcription_error)")
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

      const { data: ownParticipant } = await supabase
        .from("conversation_participants")
        .select("is_locked, locked_at, ephemeral_enabled, ephemeral_ttl_seconds")
        .eq("conversation_id", conversationId!)
        .eq("user_id", user!.id)
        .maybeSingle();

      setOwnSettings(ownParticipant || null);

      // Mark messages as read with timestamp
      await supabase
        .from("messages")
        .update({ read: true, read_at: new Date().toISOString() } as any)
        .eq("conversation_id", conversationId!)
        .neq("sender_id", user!.id)
        .is("read_at", null);

      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId!)
        .eq("user_id", user!.id);
    } catch (error) {
      toast.error("Erreur lors du chargement des messages");
    }
  };

  const updateConversationSettings = async (patch: Partial<OwnParticipantSettings>) => {
    if (!conversationId || !user || !ownSettings) return;
    const nextSettings = { ...ownSettings, ...patch };
    const validation = conversationPrivacySchema.safeParse({
      is_locked: nextSettings.is_locked,
      ephemeral_enabled: nextSettings.ephemeral_enabled,
      ephemeral_ttl_seconds: nextSettings.ephemeral_ttl_seconds,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Paramètre invalide");
      return;
    }

    setSavingSettings(true);
    const lockedChanged = patch.is_locked !== undefined;
    const { error } = await supabase
      .from("conversation_participants")
      .update({
        ...validation.data,
        locked_at: lockedChanged && validation.data.is_locked ? new Date().toISOString() : lockedChanged ? null : nextSettings.locked_at,
      })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    setSavingSettings(false);

    if (error) {
      toast.error("Impossible de mettre à jour la confidentialité");
      return;
    }

    setOwnSettings({
      ...nextSettings,
      locked_at: lockedChanged && nextSettings.is_locked ? new Date().toISOString() : lockedChanged ? null : nextSettings.locked_at,
    });
    toast.success("Paramètres privés mis à jour");
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
  };

  const deleteConversation = async () => {
    if (!conversationId) return;
    setDeletingConversation(true);
    const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
    setDeletingConversation(false);
    if (error) {
      toast.error("Suppression de la conversation impossible");
      return;
    }
    toast.success("Conversation supprimée");
    navigate("/messages");
    fetchConversations();
  };

  const transcribeVoiceMessage = async (msg: Message, audioUrl: string) => {
    const voice = msg.voice_messages?.[0];
    if (!voice?.id || voice.transcription || voice.transcription_status === "processing") return;

    setVoiceStates((prev) => ({ ...prev, [msg.id]: { status: "transcribing" } }));
    try {
      // Privacy-first preview: never uploads private audio to third-party transcription services.
      // A real STT provider can be enabled later only with explicit user opt-in.
      const text = `Message vocal sécurisé${voice.duration ? ` de ${Math.round(voice.duration)} secondes` : ""}. Transcription automatique externe désactivée pour préserver la confidentialité.`;
      if (msg.sender_id === user?.id) {
        await supabase.from("voice_messages").update({
          transcription: text,
          transcription_status: "completed",
          transcription_error: null,
        }).eq("id", voice.id);
      }
      setMessages((prev) => prev.map((message) => message.id === msg.id ? {
        ...message,
        voice_messages: message.voice_messages?.map((item) => item.id === voice.id ? {
          ...item,
          transcription: text,
          transcription_status: "completed",
          transcription_error: null,
        } : item),
      } : message));
      setVoiceStates((prev) => ({ ...prev, [msg.id]: { status: "ready" } }));
    } catch (error: any) {
      const message = error?.message || "Transcription impossible";
      await supabase.from("voice_messages").update({ transcription_status: "error", transcription_error: message }).eq("id", voice.id);
      setMessages((prev) => prev.map((item) => item.id === msg.id ? {
        ...item,
        voice_messages: item.voice_messages?.map((voiceItem) => voiceItem.id === voice.id ? {
          ...voiceItem,
          transcription_status: "error",
          transcription_error: message,
        } : voiceItem),
      } : item));
      setVoiceStates((prev) => ({ ...prev, [msg.id]: { status: "error", error: message } }));
      toast.error(message);
    }
  };

  const handleTyping = () => {
    sendTypingIndicator(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[Messages] sendMessage called');
    console.log('[Messages] newMessage:', newMessage);
    console.log('[Messages] conversationId:', conversationId);
    console.log('[Messages] user:', user);
    
    if (!newMessage.trim()) {
      console.log('[Messages] Empty message, skipping');
      return;
    }
    
    if (!conversationId) {
      console.error('[Messages] No conversation ID');
      toast.error('Aucune conversation sélectionnée');
      return;
    }
    
    if (!user) {
      console.error('[Messages] No user found');
      toast.error('Vous devez être connecté pour envoyer un message');
      return;
    }

    try {
      console.log('[Messages] Inserting message...');
      const validation = messageSchema.safeParse({ content: newMessage.trim() });
      if (!validation.success) {
        toast.error(validation.error.errors[0]?.message || "Message invalide");
        return;
      }

      const { data, error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: validation.data.content,
      }).select("*, voice_messages(id, audio_url, duration, transcription, transcription_status, transcription_error)");

      console.log('[Messages] Insert result:', { data, error });

      if (error) {
        console.error('[Messages] Message insert error:', error);
        throw error;
      }
      
      console.log('[Messages] Message sent successfully!');
      setNewMessage("");
    } catch (error: any) {
      console.error('[Messages] Error:', error);
      toast.error(`Erreur lors de l'envoi du message: ${error.message || 'Erreur inconnue'}`);
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

    // Add participants (sequential to satisfy stricter RLS)
    const { error: p1Error } = await supabase.from("conversation_participants").insert({
      conversation_id: newConvo.id,
      user_id: user!.id,
    });
    if (p1Error) {
      console.error("[Messages] Failed to add self participant:", p1Error);
      toast.error("Erreur lors de la création de la conversation");
      return;
    }

    const { error: p2Error } = await supabase.from("conversation_participants").insert({
      conversation_id: newConvo.id,
      user_id: targetUserId,
    });
    if (p2Error) {
      console.error("[Messages] Failed to add other participant:", p2Error);
      toast.error("Erreur lors de la création de la conversation");
      return;
    }

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
      
      <main className="w-full px-2 sm:px-3 lg:px-4 py-2 md:py-4">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,360px),1fr] gap-2 md:gap-3 w-full h-[calc(100dvh-120px)] md:h-[calc(100dvh-92px)] min-h-0">
          {/* Conversations list - hidden on mobile when in conversation */}
          <Card className={`md:col-span-1 min-w-0 overflow-hidden flex-col ${conversationId ? 'hidden md:flex' : 'flex'}`}>
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
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={result.avatar_url} />
                                <AvatarFallback>{result.full_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{result.full_name}</span>
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <ScrollArea className="min-h-0 flex-1">
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
                        <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.other_user.avatar_url} />
                          <AvatarFallback>
                            {conv.other_user.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <OnlineStatus userId={conv.other_user.id} />
                        </div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{conv.other_user.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message?.replace(/<[^>]*>/g, '').slice(0, 30) || "Nouvelle conversation"}
                        </p>
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
          <Card className={`md:col-span-2 min-w-0 overflow-hidden flex-col ${!conversationId ? 'hidden md:flex' : 'flex'}`}>
            {conversationId ? (
              <>
                <div className="p-2.5 md:p-4 border-b space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-secondary" />
                    <span className="min-w-0 break-words">Conversation privée : fichiers signés, accès limité aux participants, sans bucket public.</span>
                  </div>
                  <div className="flex items-center gap-3">
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
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherUser.avatar_url} />
                          <AvatarFallback>
                            {otherUser.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <OnlineStatus userId={otherUser.id} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{otherUser.full_name}</p>
                        <OnlineStatus userId={otherUser.id} showText />
                      </div>
                      <div className="flex shrink-0 gap-1">
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
                  {ownSettings && (
                    <div className="grid gap-2 rounded-xl border bg-card p-3 text-sm sm:grid-cols-3 sm:items-center">
                      <div className="flex items-center justify-between gap-3 sm:justify-start">
                        <div className="flex min-w-0 items-center gap-2">
                          {ownSettings.is_locked ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                          <Label className="text-xs font-medium">Verrouiller</Label>
                        </div>
                        <Switch
                          checked={ownSettings.is_locked}
                          disabled={savingSettings}
                          onCheckedChange={(checked) => updateConversationSettings({ is_locked: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-start">
                        <div className="flex min-w-0 items-center gap-2">
                          <TimerReset className="h-4 w-4 text-primary" />
                          <Label className="text-xs font-medium">Éphémère</Label>
                        </div>
                        <Switch
                          checked={ownSettings.ephemeral_enabled}
                          disabled={savingSettings}
                          onCheckedChange={(checked) => updateConversationSettings({ ephemeral_enabled: checked })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={String(ownSettings.ephemeral_ttl_seconds)}
                          onValueChange={(value) => updateConversationSettings({ ephemeral_ttl_seconds: Number(value) })}
                          disabled={savingSettings || !ownSettings.ephemeral_enabled}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Durée" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3600">1 heure</SelectItem>
                            <SelectItem value="86400">24 heures</SelectItem>
                            <SelectItem value="604800">7 jours</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                          disabled={deletingConversation}
                          onClick={deleteConversation}
                          title="Supprimer la conversation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <ScrollArea className="min-h-0 flex-1 p-2 sm:p-4">
                  <div className="space-y-4 overflow-hidden">
                    {messages.map((msg) => {
                      const voiceMeta = getVoiceMeta(msg);
                      const resolvedVoiceUrl = voiceMeta ? voiceUrls[msg.id] : null;
                      const voiceState = voiceMeta ? voiceStates[msg.id] : null;
                      const isOwnMessage = msg.sender_id === user?.id;

                      return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isOwnMessage
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`group relative max-w-[94%] sm:max-w-[86%] lg:max-w-[72%] rounded-2xl px-3 sm:px-4 py-2 overflow-hidden ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          }`}
                        >
                          {voiceMeta ? (
                            <div className="w-[min(78vw,380px)] max-w-full space-y-2">
                              {resolvedVoiceUrl ? (
                                <audio
                                  src={resolvedVoiceUrl}
                                  controls
                                  preload="metadata"
                                  onError={() => setVoiceStates((prev) => ({ ...prev, [msg.id]: { status: "error", error: "Lecture audio impossible" } }))}
                                  className="block h-10 w-full max-w-full min-w-0 rounded-full [color-scheme:light]"
                                />
                              ) : (
                                <div className="flex items-center gap-2 text-sm opacity-80">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Chargement du vocal…
                                </div>
                              )}
                              <div className="rounded-lg bg-background/15 p-2 text-xs leading-relaxed">
                                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                  <Badge variant={isOwnMessage ? "outline" : "secondary"} className="max-w-full border-current/20 bg-background/20 text-[10px]">
                                    🎤 Vocal{voiceMeta.duration ? ` · ${Math.round(voiceMeta.duration)}s` : ''}
                                  </Badge>
                                  {msg.expires_at && (
                                    <Badge variant="outline" className="border-current/20 bg-background/20 text-[10px]">
                                      expire {new Date(msg.expires_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                                    </Badge>
                                  )}
                                </div>
                                {voiceState?.status === "error" || voiceMeta.transcription_status === "error" ? (
                                  <div className="flex items-start gap-1.5 text-destructive-foreground/90">
                                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="break-words">{voiceState?.error || voiceMeta.transcription_error || "Transcription/lecture indisponible"}</span>
                                  </div>
                                ) : voiceState?.status === "transcribing" || voiceMeta.transcription_status === "processing" ? (
                                  <div className="flex items-center gap-1.5 opacity-80">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Transcription en cours…
                                  </div>
                                ) : (
                                  <p className="break-words opacity-90">{getVoicePreview(msg)}</p>
                                )}
                                {resolvedVoiceUrl && !voiceMeta.transcription && voiceMeta.transcription_status !== "processing" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 h-7 px-2 text-[11px]"
                                    onClick={() => transcribeVoiceMessage(msg, resolvedVoiceUrl)}
                                  >
                                    Prévisualiser
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="message-content prose prose-sm max-w-none break-words overflow-x-auto [&_p]:m-0" 
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.content) }} 
                            />
                          )}
                          <div className={`flex items-center justify-between gap-2 text-xs mt-1 ${
                            msg.sender_id === user?.id 
                              ? "text-primary-foreground/70" 
                              : "text-muted-foreground"
                          }`}>
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isOwnMessage && (
                              <span className="ml-1 flex items-center gap-1">
                                {msg.read_at ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                                ) : msg.delivered_at ? (
                                  <CheckCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                <button
                                  type="button"
                                  className="opacity-0 transition-opacity group-hover:opacity-100"
                                  onClick={() => deleteMessage(msg.id)}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            )}
                          </div>
                          {/* Message Reactions */}
                          <div className="absolute -bottom-3 left-2">
                            <MessageReactions messageId={msg.id} />
                          </div>
                        </div>
                      </div>
                    );})}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {conversationId && (
                  <TypingIndicator conversationId={conversationId} />
                )}

                {/* AI Smart Reply Suggestions */}
                <SmartReply
                  messages={messages.slice(-5).map(m => ({
                    sender: m.sender_id === user?.id ? "me" : "other",
                    content: m.content.replace(/<[^>]*>/g, "").slice(0, 100),
                  }))}
                  onSelectReply={(reply) => setNewMessage(reply)}
                />

                <form onSubmit={sendMessage} className="p-2 sm:p-3 md:p-4 border-t space-y-2">
                  <RichTextEditor
                    content={newMessage}
                    onChange={(value) => {
                      setNewMessage(value);
                      handleTyping();
                    }}
                    placeholder="Écrivez un message..."
                    minHeight="60px"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                      <ScheduledMessaging 
                        conversationId={conversationId} 
                        onMessageScheduled={() => {}}
                      />
                      <VoiceRecorder 
                        onSend={async (audioBlob, duration) => {
                          const fileName = `voice-${Date.now()}.webm`;
                          const filePath = `${user!.id}/${fileName}`;
                          
                            const { error: uploadError } = await supabase.storage
                            .from('messages')
                              .upload(filePath, audioBlob, { contentType: 'audio/webm', upsert: false });
                          
                          if (uploadError) {
                            toast.error("Erreur lors de l'envoi du message vocal");
                            return;
                          }
                          
                          const messageContent = `
                            <div class="voice-message" data-voice-path="${filePath}">
                              <p>🎤 Message vocal · ${Math.round(duration)}s</p>
                            </div>
                          `;
                          
                            const { data: inserted, error } = await supabase.from("messages").insert({
                            conversation_id: conversationId,
                            sender_id: user!.id,
                            content: messageContent.trim(),
                          }).select('id').single();
                          
                          if (error) {
                            toast.error("Erreur lors de l'envoi");
                          } else {
                              const { error: voiceError } = await supabase.from('voice_messages').insert({
                              message_id: inserted.id,
                              audio_url: filePath,
                              duration: Math.round(duration),
                                transcription: `Message vocal de ${Math.round(duration)} secondes`,
                                transcription_status: 'completed',
                            });
                              if (voiceError) {
                                toast.error("Message envoyé, mais l'index vocal a échoué");
                                return;
                              }
                            const signedUrl = await getStorageUrl('messages', filePath);
                            if (signedUrl) setVoiceUrls(prev => ({ ...prev, [inserted.id]: signedUrl }));
                              setVoiceStates(prev => ({ ...prev, [inserted.id]: { status: signedUrl ? 'ready' : 'error', error: signedUrl ? undefined : 'Fichier vocal inaccessible' } }));
                            toast.success("Message vocal envoyé");
                              fetchMessages();
                          }
                        }}
                      />
                    </div>
                    <Button type="submit" disabled={!newMessage.trim()} className="w-full sm:w-auto">
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
      {showVideoCall && otherUser && conversationId && (
        <WebRTCCall
          open={showVideoCall}
          onClose={() => setShowVideoCall(false)}
          conversationId={conversationId}
          remoteUserId={otherUser.id}
          remoteUserName={otherUser.full_name}
          remoteUserAvatar={otherUser.avatar_url}
          isAudioOnly={callType === 'audio'}
        />
      )}
      
      <MobileNav />
    </div>
  );
};

export default Messages;
