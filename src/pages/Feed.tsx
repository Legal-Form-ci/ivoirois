import { useEffect, useState } from "react";
import Header from "@/components/Header";
import UltraCreatePost from "@/components/UltraCreatePost";
import EnhancedPostCard from "@/components/EnhancedPostCard";
import Stories from "@/components/Stories";
import SearchUsers from "@/components/SearchUsers";
import MobileNav from "@/components/MobileNav";
import FeedLeftRail from "@/components/FeedLeftRail";
import FeedRightRail from "@/components/FeedRightRail";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { refreshMediaUrls, repairMediaRows } from "@/lib/storage";
interface Post {
  id: string;
  content: string;
  title?: string;
  hook?: string;
  image_url?: string;
  media_urls?: string[];
  media_types?: string[];
  links?: string[];
  hashtags?: string[];
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
    region?: string;
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
          profiles(username, full_name, avatar_url, region),
          likes(count),
          comments(count)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Re-sign private-bucket media URLs (posts bucket signed URLs expire after 1h).
      const withFresh = await Promise.all(
        (data || []).map(async (p: any) => {
          const media_urls = await refreshMediaUrls("posts", p.media_urls);
          const image_url = p.image_url
            ? (await refreshMediaUrls("posts", [p.image_url]))[0] || p.image_url
            : p.image_url;
          return { ...p, media_urls, image_url };
        })
      );

      // Fire-and-forget: rewrite any row that still stores expired signed URLs
      // back to a stable bucket-relative path so future fetches only re-sign.
      repairMediaRows("posts", data || [], ["media_urls", "image_url"]).catch(() => {});

      // Prioritize posts from same region
      if (myRegion && withFresh.length) {
        const sorted = withFresh.sort((a: any, b: any) => {
          const aFromRegion = a.profiles?.region === myRegion;
          const bFromRegion = b.profiles?.region === myRegion;
          if (aFromRegion && !bFromRegion) return -1;
          if (!aFromRegion && bFromRegion) return 1;
          return 0;
        });
        setPosts(sorted);
      } else {
        setPosts(withFresh);
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
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6 py-4 md:py-6">
        <div className="flex gap-6 items-start">
          <FeedLeftRail />
          <div className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0 space-y-4 md:space-y-5">
            <SearchUsers />
            <Stories />
            <UltraCreatePost onPostCreated={fetchPosts} />

            <div className="space-y-4">
              {loading ? (
                <div className="surface-card text-center py-10">
                  <p className="text-muted-foreground">Chargement du fil…</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="surface-card text-center py-10 px-4">
                  <p className="text-muted-foreground">
                    Aucune publication pour le moment. Soyez le premier à publier !
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <EnhancedPostCard
                    key={post.id}
                    id={post.id}
                    authorId={post.user_id}
                    authorName={post.profiles.full_name}
                    authorAvatar={post.profiles.avatar_url || ''}
                    title={post.title}
                    hook={post.hook}
                    content={post.content}
                    mediaUrls={post.media_urls}
                    mediaTypes={post.media_types}
                    links={post.links}
                    hashtags={post.hashtags}
                    imageUrl={post.image_url}
                    createdAt={post.created_at}
                    likesCount={post.likes[0]?.count || 0}
                    commentsCount={post.comments[0]?.count || 0}
                    onDeleted={fetchPosts}
                  />
                ))
              )}
            </div>
          </div>
          <FeedRightRail />
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default Feed;
