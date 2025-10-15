import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import TypingIndicator from "@/components/TypingIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

const GroupChat = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (groupId && user) {
      fetchGroupInfo();
      fetchMessages();

      const channel = supabase
        .channel(`group-${groupId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "group_messages",
            filter: `group_id=eq.${groupId}`,
          },
          async (payload) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", payload.new.sender_id)
              .single();

            setMessages((prev) => [
              ...prev,
              { ...payload.new, profiles: profile } as Message,
            ]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [groupId, user]);

  const fetchGroupInfo = async () => {
    const { data } = await supabase
      .from("groups" as any)
      .select("*, group_members(count)")
      .eq("id", groupId!)
      .single();

    setGroupInfo(data);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("group_messages" as any)
      .select("*, profiles(full_name, avatar_url)")
      .eq("group_id", groupId!)
      .order("created_at", { ascending: true });

    setMessages((data || []) as unknown as Message[]);
  };

  const handleTyping = async (typing: boolean) => {
    if (typing !== isTyping) {
      setIsTyping(typing);
      await supabase.from("typing_indicators" as any).upsert({
        group_id: groupId,
        user_id: user!.id,
        is_typing: typing,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await supabase.from("group_messages" as any).insert({
        group_id: groupId,
        sender_id: user!.id,
        content: newMessage.trim(),
      });

      setNewMessage("");
      handleTyping(false);
    } catch (error) {
      toast.error("Erreur lors de l'envoi du message");
    }
  };

  const uploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${groupId}/${Date.now()}.${fileExt}`;
      const mediaType = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "file";

      const { error: uploadError } = await supabase.storage
        .from("groups")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("groups")
        .getPublicUrl(fileName);

      await supabase.from("group_messages" as any).insert({
        group_id: groupId,
        sender_id: user!.id,
        content: `Fichier partagé: ${file.name}`,
        media_url: publicUrl,
        media_type: mediaType,
      });

      toast.success("Fichier envoyé !");
    } catch (error) {
      toast.error("Erreur lors de l'envoi du fichier");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <Card className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/groups")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {groupInfo && (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={groupInfo.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {groupInfo.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{groupInfo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {groupInfo.group_members[0]?.count || 0} membres
                  </p>
                </div>
              </>
            )}
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.sender_id === user?.id ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.profiles.avatar_url} />
                    <AvatarFallback>
                      {msg.profiles.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.sender_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.sender_id !== user?.id && (
                      <p className="text-xs font-semibold mb-1">
                        {msg.profiles.full_name}
                      </p>
                    )}
                    {msg.media_url && msg.media_type === "image" && (
                      <img
                        src={msg.media_url}
                        alt="Média"
                        className="rounded mb-2 max-w-full"
                      />
                    )}
                    <p>{msg.content}</p>
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

          <TypingIndicator groupId={groupId} />

          <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
            <label htmlFor="group-media" className="cursor-pointer">
              <Button type="button" variant="ghost" size="icon" asChild>
                <div>
                  <ImageIcon className="h-5 w-5" />
                </div>
              </Button>
            </label>
            <input
              id="group-media"
              type="file"
              className="hidden"
              accept="image/*,video/*"
              onChange={uploadMedia}
            />
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping(e.target.value.length > 0);
              }}
              onBlur={() => handleTyping(false)}
              placeholder="Écrivez un message..."
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default GroupChat;
