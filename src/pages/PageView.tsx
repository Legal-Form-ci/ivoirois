import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Globe, 
  Users, 
  Calendar, 
  MapPin, 
  ExternalLink,
  Heart,
  Share2,
  MessageCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Page {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_image: string | null;
  profile_image: string | null;
  website: string | null;
  created_at: string;
  created_by: string;
}

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

const PageView = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { user } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pageId) {
      fetchPage();
      fetchPosts();
      fetchFollowers();
    }
  }, [pageId, user]);

  const fetchPage = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("id", pageId)
        .single();

      if (error) throw error;
      setPage(data);
    } catch (error) {
      toast.error("Page introuvable");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    // For now, pages don't have posts directly linked
    // This would need a page_posts table or page_id on posts
    setPosts([]);
  };

  const fetchFollowers = async () => {
    if (!pageId) return;

    const { count } = await supabase
      .from("page_followers")
      .select("*", { count: "exact", head: true })
      .eq("page_id", pageId);

    setFollowersCount(count || 0);

    if (user) {
      const { data } = await supabase
        .from("page_followers")
        .select("id")
        .eq("page_id", pageId)
        .eq("user_id", user.id)
        .maybeSingle();

      setIsFollowing(!!data);
    }
  };

  const toggleFollow = async () => {
    if (!user || !pageId) return;

    try {
      if (isFollowing) {
        await supabase
          .from("page_followers")
          .delete()
          .eq("page_id", pageId)
          .eq("user_id", user.id);
        setFollowersCount((prev) => prev - 1);
      } else {
        await supabase.from("page_followers").insert({
          page_id: pageId,
          user_id: user.id,
        });
        setFollowersCount((prev) => prev + 1);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      toast.error("Erreur lors de l'action");
    }
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

  if (!page) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container py-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Page introuvable</h1>
          <Link to="/pages">
            <Button>Retour aux pages</Button>
          </Link>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      
      <main className="container py-4 md:py-6">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          {/* Cover & Profile */}
          <Card className="overflow-hidden">
            <div className="relative">
              <div 
                className="h-32 md:h-48 bg-gradient-to-r from-primary/20 to-primary/40"
                style={page.cover_image ? { 
                  backgroundImage: `url(${page.cover_image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}}
              />
              <div className="absolute -bottom-12 left-4 md:left-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={page.profile_image || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {page.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            
            <CardContent className="pt-16 pb-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold">{page.name}</h1>
                  {page.category && (
                    <Badge variant="secondary" className="mt-2">
                      {page.category}
                    </Badge>
                  )}
                  {page.description && (
                    <p className="text-muted-foreground mt-3 whitespace-pre-wrap">
                      {page.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {followersCount} abonné{followersCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Créée {formatDistanceToNow(new Date(page.created_at), { addSuffix: true, locale: fr })}
                    </span>
                    {page.website && (
                      <a 
                        href={page.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Globe className="h-4 w-4" />
                        Site web
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={toggleFollow}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-current text-red-500' : ''}`} />
                    {isFollowing ? "Abonné" : "S'abonner"}
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="posts">Publications</TabsTrigger>
              <TabsTrigger value="about">À propos</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-4">
              <Card className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune publication pour le moment</p>
              </Card>
            </TabsContent>
            
            <TabsContent value="about" className="mt-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Informations</h3>
                <div className="space-y-3">
                  {page.category && (
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{page.category}</Badge>
                    </div>
                  )}
                  {page.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a 
                        href={page.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {page.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>Page créée le {new Date(page.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="photos" className="mt-4">
              <Card className="p-8 text-center text-muted-foreground">
                <p>Aucune photo pour le moment</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
};

export default PageView;
