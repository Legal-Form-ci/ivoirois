import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

interface SuggestedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  region?: string;
}

const SuggestedUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, [user]);

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      // Get user's profile to find their region
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("region")
        .eq("id", user.id)
        .single();

      // Get existing friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id, user_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = friendships?.map((f) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Fetch suggested users (same region first, then others)
      let query = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, region")
        .neq("id", user.id);

      if (friendIds.length > 0) {
        query = query.not("id", "in", `(${friendIds.join(",")})`);
      }

      if (myProfile?.region) {
        query = query.order("region", { ascending: false });
      }

      const { data, error } = await query.limit(5);

      if (error) throw error;

      // Prioritize same region
      const sorted = data?.sort((a, b) => {
        if (myProfile?.region) {
          if (a.region === myProfile.region && b.region !== myProfile.region) return -1;
          if (a.region !== myProfile.region && b.region === myProfile.region) return 1;
        }
        return 0;
      }) || [];

      setSuggestions(sorted);
    } catch (error: any) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: friendId,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Demande d'ami envoyée");
      fetchSuggestions();
    } catch (error: any) {
      toast.error("Erreur lors de l'envoi de la demande");
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="text-lg">Suggestions d'amis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggested) => (
          <div
            key={suggested.id}
            className="flex items-center justify-between gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => navigate(`/profile/${suggested.id}`)}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={suggested.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {suggested.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{suggested.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  @{suggested.username}
                </p>
                {suggested.region && (
                  <p className="text-xs text-muted-foreground">{suggested.region}</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendFriendRequest(suggested.id)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SuggestedUsers;
