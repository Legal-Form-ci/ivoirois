import { useEffect, useState } from "react";
import Header from "@/components/Header";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import Stories from "@/components/Stories";
import SearchUsers from "@/components/SearchUsers";
import SuggestedUsers from "@/components/SuggestedUsers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  likes: { count: number }[];
  comments: { count: number }[];
}

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();

    // Subscribe to new posts
    const channel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      // Get current user's profile to filter by region if needed
      let myRegion = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("region")
          .eq("id", user.id)
          .single();
        myRegion = profile?.region;
      }

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!posts_user_id_fkey(username, full_name, avatar_url, region),
          likes(count),
          comments(count)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Prioritize posts from same region
      if (myRegion && data) {
        const sorted = data.sort((a, b) => {
          const aFromRegion = a.profiles?.region === myRegion;
          const bFromRegion = b.profiles?.region === myRegion;
          if (aFromRegion && !bFromRegion) return -1;
          if (!aFromRegion && bFromRegion) return 1;
          return 0;
        });
        setPosts(sorted);
      } else {
        setPosts(data || []);
      }
    } catch (error: any) {
      toast.error("Erreur lors du chargement des posts");
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInMs = now.getTime() - postDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      return `Il y a ${diffInMins} minute${diffInMins > 1 ? "s" : ""}`;
    }
    if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? "s" : ""}`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? "s" : ""}`;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <SearchUsers />
          <SuggestedUsers />
          <Stories />
          <CreatePost onPostCreated={fetchPosts} />

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Aucune publication pour le moment. Soyez le premier à publier !
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  postId={post.id}
                  userId={post.user_id}
                  author={post.profiles.full_name}
                  authorAvatar={post.profiles.avatar_url}
                  content={post.content}
                  image={post.image_url}
                  likes={post.likes[0]?.count || 0}
                  comments={post.comments[0]?.count || 0}
                  timeAgo={getTimeAgo(post.created_at)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Feed;
