import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Check, X, UserPlus } from "lucide-react";

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

const Friends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [sent, setSent] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriendships();
  }, [user]);

  const fetchFriendships = async () => {
    if (!user) return;

    try {
      // Friends (accepted)
      const { data: acceptedData, error: acceptedError } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (acceptedError) throw acceptedError;

      // Fetch profiles for the "other" user in each friendship
      const friendsWithProfiles = await Promise.all(
        (acceptedData || []).map(async (f) => {
          const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", otherId)
            .single();
          return { ...f, profile: profile || { id: otherId, full_name: "Utilisateur", username: "user", avatar_url: null } };
        })
      );
      setFriends(friendsWithProfiles);

      // Received requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("friendships")
        .select("*")
        .eq("friend_id", user.id)
        .eq("status", "pending");

      if (requestsError) throw requestsError;

      const requestsWithProfiles = await Promise.all(
        (requestsData || []).map(async (f) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", f.user_id)
            .single();
          return { ...f, profile: profile || { id: f.user_id, full_name: "Utilisateur", username: "user", avatar_url: null } };
        })
      );
      setRequests(requestsWithProfiles);

      // Sent requests
      const { data: sentData, error: sentError } = await supabase
        .from("friendships")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (sentError) throw sentError;

      const sentWithProfiles = await Promise.all(
        (sentData || []).map(async (f) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", f.friend_id)
            .single();
          return { ...f, profile: profile || { id: f.friend_id, full_name: "Utilisateur", username: "user", avatar_url: null } };
        })
      );
      setSent(sentWithProfiles);
    } catch (error: any) {
      console.error("Friendship fetch error:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Demande d'ami acceptée");
      fetchFriendships();
    } catch (error: any) {
      toast.error("Erreur");
    }
  };

  const rejectRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Demande d'ami refusée");
      fetchFriendships();
    } catch (error: any) {
      toast.error("Erreur");
    }
  };

  const cancelRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Demande annulée");
      fetchFriendships();
    } catch (error: any) {
      toast.error("Erreur");
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Ami retiré");
      fetchFriendships();
    } catch (error: any) {
      toast.error("Erreur");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container py-6 text-center">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Amis</h1>

          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="friends">
                Amis ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                Demandes ({requests.length})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Envoyées ({sent.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-4">
              {friends.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Vous n'avez pas encore d'amis
                </Card>
              ) : (
                friends.map((friendship) => (
                  <Card key={friendship.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/profile/${friendship.profile.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friendship.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {friendship.profile.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{friendship.profile.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{friendship.profile.username}
                          </p>
                        </div>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFriend(friendship.id)}
                      >
                        Retirer
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              {requests.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Aucune demande d'ami
                </Card>
              ) : (
                requests.map((friendship) => (
                  <Card key={friendship.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/profile/${friendship.profile.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friendship.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {friendship.profile.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{friendship.profile.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{friendship.profile.username}
                          </p>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => acceptRequest(friendship.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rejectRequest(friendship.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-4">
              {sent.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Aucune demande envoyée
                </Card>
              ) : (
                sent.map((friendship) => (
                  <Card key={friendship.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/profile/${friendship.profile.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friendship.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {friendship.profile.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{friendship.profile.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{friendship.profile.username}
                          </p>
                        </div>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelRequest(friendship.id)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default Friends;
