import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, UserPlus, UserCheck, UserMinus, Edit, X, Check, MessageCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  region?: string;
  phone_number?: string;
  profession?: string;
  sector?: string;
  position?: string;
  experience_level?: string;
  years_of_experience?: number;
  education_level?: string;
  marital_status?: string;
  religion?: string;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes: { count: number }[];
  comments: { count: number }[];
}

const Profile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    if (user && id && user.id !== id) {
      checkFriendship();
    }
  }, [id, user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          likes(count),
          comments(count)
        `)
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des publications");
    }
  };

  const checkFriendship = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFriendshipId(data.id);
        if (data.user_id === user.id) {
          setFriendshipStatus(data.status);
        } else {
          setFriendshipStatus(data.status === "pending" ? "received" : data.status);
        }
      } else {
        setFriendshipStatus(null);
        setFriendshipId(null);
      }
    } catch (error: any) {
      toast.error("Erreur lors de la vérification de l'amitié");
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !id) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: id,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Demande d'ami envoyée");
      checkFriendship();
    } catch (error: any) {
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelFriendRequest = async () => {
    if (!friendshipId) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Demande annulée");
      checkFriendship();
    } catch (error: any) {
      toast.error("Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!friendshipId) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Demande acceptée");
      checkFriendship();
    } catch (error: any) {
      toast.error("Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const removeFriend = async () => {
    if (!friendshipId) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Ami retiré");
      checkFriendship();
    } catch (error: any) {
      toast.error("Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const startConversation = async () => {
    try {
      const { data: existing } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user!.id);

      if (existing && existing.length > 0) {
        for (const conv of existing) {
          const { data: otherParticipants } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.conversation_id)
            .eq("user_id", id)
            .maybeSingle();

          if (otherParticipants) {
            navigate(`/messages/${conv.conversation_id}`);
            return;
          }
        }
      }

      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      await supabase.from("conversation_participants").insert([
        { conversation_id: newConv.id, user_id: user!.id },
        { conversation_id: newConv.id, user_id: id },
      ]);

      navigate(`/messages/${newConv.id}`);
    } catch (error) {
      toast.error("Erreur lors de la création de la conversation");
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container py-6 text-center">
          <p>Profil introuvable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                    {profile.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                    <p className="text-muted-foreground">@{profile.username}</p>
                  </div>

                  {profile.bio && <p className="text-foreground">{profile.bio}</p>}

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {profile.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </div>
                    )}
                    {profile.region && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.region}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Membre depuis {new Date(profile.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  {/* Professional Information */}
                  {(profile.profession || profile.sector || profile.position) && (
                    <div className="border-t pt-4 space-y-2">
                      <h3 className="font-semibold text-sm">Informations professionnelles</h3>
                      <div className="space-y-1 text-sm">
                        {profile.profession && (
                          <p><span className="text-muted-foreground">Profession:</span> {profile.profession}</p>
                        )}
                        {profile.sector && (
                          <p><span className="text-muted-foreground">Secteur:</span> {profile.sector}</p>
                        )}
                        {profile.position && (
                          <p><span className="text-muted-foreground">Poste:</span> {profile.position}</p>
                        )}
                        {profile.experience_level && (
                          <p><span className="text-muted-foreground">Expérience:</span> {profile.experience_level}</p>
                        )}
                        {profile.years_of_experience && (
                          <p><span className="text-muted-foreground">Années d'expérience:</span> {profile.years_of_experience} ans</p>
                        )}
                        {profile.education_level && (
                          <p><span className="text-muted-foreground">Niveau d'études:</span> {profile.education_level}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Personal Information (only visible to profile owner) */}
                  {user?.id === id && (profile.marital_status || profile.religion || profile.phone_number) && (
                    <div className="border-t pt-4 space-y-2">
                      <h3 className="font-semibold text-sm">Informations personnelles</h3>
                      <div className="space-y-1 text-sm">
                        {profile.phone_number && (
                          <p><span className="text-muted-foreground">Téléphone:</span> {profile.phone_number}</p>
                        )}
                        {profile.marital_status && (
                          <p><span className="text-muted-foreground">Statut matrimonial:</span> {profile.marital_status}</p>
                        )}
                        {profile.religion && (
                          <p><span className="text-muted-foreground">Religion:</span> {profile.religion}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {user?.id === id ? (
                    <div className="flex gap-2">
                      <Button variant="default" className="gap-2" asChild>
                        <Link to="/edit-profile">
                          <Edit className="h-4 w-4" />
                          Modifier le profil
                        </Link>
                      </Button>
                      <Button variant="outline" className="gap-2" asChild>
                        <Link to="/settings">
                          <Settings className="h-4 w-4" />
                          Paramètres
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      {friendshipStatus === null && (
                        <Button
                          variant="default"
                          className="gap-2"
                          onClick={sendFriendRequest}
                          disabled={actionLoading}
                        >
                          <UserPlus className="h-4 w-4" />
                          Ajouter en ami
                        </Button>
                      )}
                      {friendshipStatus === "pending" && (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={cancelFriendRequest}
                          disabled={actionLoading}
                        >
                          <X className="h-4 w-4" />
                          Annuler la demande
                        </Button>
                      )}
                      {friendshipStatus === "received" && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={acceptFriendRequest}
                            disabled={actionLoading}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelFriendRequest}
                            disabled={actionLoading}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      )}
                      {friendshipStatus === "accepted" && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            className="gap-2"
                            onClick={startConversation}
                          >
                            <MessageCircle className="h-4 w-4" />
                            Envoyer un message
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={removeFriend}
                            disabled={actionLoading}
                          >
                            <UserMinus className="h-4 w-4" />
                            Retirer des amis
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Publications</h2>
            {posts.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Aucune publication pour le moment
              </Card>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  postId={post.id}
                  userId={profile.id}
                  author={profile.full_name}
                  authorAvatar={profile.avatar_url}
                  content={post.content}
                  image={post.image_url}
                  likes={post.likes[0]?.count || 0}
                  comments={post.comments[0]?.count || 0}
                  timeAgo={new Date(post.created_at).toLocaleDateString("fr-FR")}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
