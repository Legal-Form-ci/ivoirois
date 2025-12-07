import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Heart, MessageCircle, UserPlus, Check, Eye, ThumbsUp, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
  from_user_id: string | null;
  post_id: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const newNotification = payload.new as any;
          fetchNotificationWithProfile(newNotification.id);
          toast.info("Nouvelle notification", {
            description: newNotification.content,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchNotificationWithProfile = async (notificationId: string) => {
    const { data } = await supabase
      .from("notifications")
      .select(`
        *,
        profiles:profiles!notifications_from_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq("id", notificationId)
      .single();

    if (data) {
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select(`
        *,
        profiles:profiles!notifications_from_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (!error) {
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (!error) {
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications marquées comme lues");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
      case "reaction":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "comment":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "friend_request":
      case "friend_accepted":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "follow":
        return <Eye className="h-4 w-4 text-purple-500" />;
      case "group":
        return <Users className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    setOpen(false);
    
    if (notification.post_id) {
      navigate("/feed");
    } else if (notification.from_user_id) {
      navigate(`/profile/${notification.from_user_id}`);
    } else {
      navigate("/notifications");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {notification.profiles ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={notification.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {notification.profiles.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {getIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {notification.profiles && (
                          <span className="font-semibold">
                            {notification.profiles.full_name}{" "}
                          </span>
                        )}
                        {notification.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Button 
            variant="ghost" 
            className="w-full text-sm" 
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            Voir toutes les notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
