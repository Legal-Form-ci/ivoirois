import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnlineStatusProps {
  userId: string;
  showText?: boolean;
}

const OnlineStatus = ({ userId, showText = false }: OnlineStatusProps) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();

    const channel = supabase
      .channel(`user-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          setIsOnline(payload.new.is_online);
          setLastSeen(payload.new.last_seen);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (user?.id) {
      updateOnlineStatus(true);

      const interval = setInterval(() => {
        updateOnlineStatus(true);
      }, 30000);

      window.addEventListener("beforeunload", () => updateOnlineStatus(false));

      return () => {
        clearInterval(interval);
        updateOnlineStatus(false);
        window.removeEventListener("beforeunload", () => updateOnlineStatus(false));
      };
    }
  }, [user]);

  const fetchStatus = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("is_online, last_seen")
      .eq("id", userId)
      .single() as any;

    if (data) {
      setIsOnline(data.is_online);
      setLastSeen(data.last_seen);
    }
  };

  const updateOnlineStatus = async (online: boolean) => {
    await supabase
      .from("profiles")
      .update({
        is_online: online,
        last_seen: new Date().toISOString(),
      } as any)
      .eq("id", user!.id);
  };

  const getLastSeenText = () => {
    if (!lastSeen) return "Hors ligne";
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          isOnline ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      {showText && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? "En ligne" : getLastSeenText()}
        </span>
      )}
    </div>
  );
};

export default OnlineStatus;
