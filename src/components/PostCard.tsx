import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface PostCardProps {
  postId?: string;
  userId?: string;
  author: string;
  authorAvatar?: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timeAgo: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

const PostCard = ({ postId, userId, author, authorAvatar, content, image, likes: initialLikes, comments: initialComments, timeAgo }: PostCardProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsCount, setCommentsCount] = useState(initialComments);

  useEffect(() => {
    if (postId && user) {
      checkIfLiked();
    }
  }, [postId, user]);

  const checkIfLiked = async () => {
    if (!postId || !user) return;
    
    try {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single();

      setLiked(!!data);
    } catch (error) {
      // No like found
    }
  };

  const handleLike = async () => {
    if (!postId || !user) return;

    try {
      if (liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: user.id });
        
        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error: any) {
      toast.error("Erreur lors de l'action");
    }
  };

  const loadComments = async () => {
    if (!postId) return;

    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des commentaires");
    }
  };

  const handleCommentClick = () => {
    setShowComments(!showComments);
    if (!showComments) {
      loadComments();
    }
  };

  const handleAddComment = async () => {
    if (!postId || !user || !newComment.trim()) return;

    try {
      await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        });

      setNewComment("");
      setCommentsCount(prev => prev + 1);
      loadComments();
      toast.success("Commentaire ajouté !");
    } catch (error: any) {
      toast.error("Erreur lors de l'ajout du commentaire");
    }
  };

  return (
    <Card className="overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all duration-300">
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <Link to={`/profile/${userId}`}>
          <Avatar className="cursor-pointer hover:ring-2 ring-primary transition-all">
            <AvatarImage src={authorAvatar} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {author.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link to={`/profile/${userId}`}>
            <p className="font-semibold hover:text-primary transition-colors cursor-pointer">
              {author}
            </p>
          </Link>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 space-y-3">
        <div
          className="prose prose-sm max-w-none text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        {image && (
          image.match(/\.(mp4|webm|ogg)$/i) ? (
            <video src={image} controls className="w-full rounded-lg max-h-96" />
          ) : image.match(/\.(mp3|wav|m4a|ogg)$/i) ? (
            <audio src={image} controls className="w-full" />
          ) : (
            <img 
              src={image} 
              alt="Post media" 
              className="w-full rounded-lg object-cover max-h-96"
            />
          )
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t pt-3 bg-muted/30">
        <div className="flex items-center justify-around w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center gap-2 ${liked ? "text-destructive" : ""}`}
            onClick={handleLike}
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
            <span className="text-sm">{likesCount}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleCommentClick}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">{commentsCount}</span>
          </Button>
          <Button variant="ghost" size="sm">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        {showComments && (
          <div className="w-full space-y-3 pt-3 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Écrire un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <Button size="icon" onClick={handleAddComment}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profiles.avatar_url} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      {comment.profiles.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted rounded-lg p-2">
                    <p className="font-semibold text-sm">{comment.profiles.full_name}</p>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PostCard;
