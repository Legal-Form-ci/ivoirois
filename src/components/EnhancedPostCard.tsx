import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, ExternalLink, FileText, Image, Video, Music, MoreHorizontal, Bookmark, BookmarkCheck, Trash2, Flag, Copy } from 'lucide-react';
import ReactionPicker from './ReactionPicker';
import ShareButton from './ShareButton';
import { toast } from 'sonner';

interface EnhancedPostCardProps {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title?: string;
  hook?: string;
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  links?: string[];
  hashtags?: string[];
  imageUrl?: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  onDeleted?: () => void;
}

const EnhancedPostCard = ({
  id,
  authorId,
  authorName,
  authorAvatar,
  title,
  hook,
  content,
  mediaUrls,
  mediaTypes,
  links,
  hashtags,
  imageUrl,
  createdAt,
  likesCount,
  commentsCount,
  onDeleted
}: EnhancedPostCardProps) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentCount, setCommentCount] = useState(commentsCount);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const safeMediaUrls = mediaUrls ?? [];
  const safeMediaTypes = mediaTypes ?? [];
  const safeLinks = links ?? [];
  const safeHashtags = hashtags ?? [];
  const isOwner = user?.id === authorId;

  useEffect(() => {
    if (user) checkIfSaved();
  }, [user, id]);

  const checkIfSaved = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsSaved(!!data);
  };

  const toggleSave = async () => {
    if (!user) return;
    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('post_id', id).eq('user_id', user.id);
      setIsSaved(false);
      toast.success('Publication retirée des favoris');
    } else {
      await supabase.from('saved_posts').insert({ post_id: id, user_id: user.id });
      setIsSaved(true);
      toast.success('Publication enregistrée');
    }
  };

  const deletePost = async () => {
    if (!user || !isOwner) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
      toast.success('Publication supprimée');
      onDeleted?.();
    } else {
      toast.error('Erreur lors de la suppression');
    }
  };

  const reportPost = async () => {
    if (!user) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      content_id: id,
      content_type: 'post',
      reason: 'inappropriate',
    });
    if (!error) toast.success('Signalement envoyé');
    else toast.error('Erreur lors du signalement');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${id}`);
    toast.success('Lien copié !');
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    if (diffInSeconds < 60) return "À l'instant";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} j`;
    return postDate.toLocaleDateString('fr-FR');
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles:user_id (full_name, avatar_url)')
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    if (!error && data) setComments(data);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    const { error } = await supabase.from('comments').insert({
      post_id: id,
      user_id: user.id,
      content: newComment
    });
    if (!error) {
      setNewComment('');
      loadComments();
      setCommentCount(prev => prev + 1);
    }
  };

  const renderMedia = () => {
    const urls = safeMediaUrls;
    const types = safeMediaTypes;

    if (urls.length === 0 && imageUrl) {
      return <img src={imageUrl} alt="Post" className="w-full rounded-lg object-cover max-h-96" />;
    }
    if (urls.length === 0) return null;

    return (
      <div className={`grid gap-2 ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {urls.map((url, index) => {
          const type = types[index] || '';
          if (type.startsWith('image/')) return <img key={index} src={url} alt={`Media ${index + 1}`} className="w-full rounded-lg object-cover max-h-64" />;
          if (type.startsWith('video/')) return <video key={index} src={url} controls className="w-full rounded-lg max-h-64" />;
          if (type.startsWith('audio/')) return <audio key={index} src={url} controls className="w-full" />;
          return (
            <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80">
              <FileText className="w-5 h-5" /><span className="text-sm truncate">Document {index + 1}</span><ExternalLink className="w-4 h-4 ml-auto" />
            </a>
          );
        })}
      </div>
    );
  };

  // Truncate long content
  const MAX_LENGTH = 400;
  const shouldTruncate = content && content.length > MAX_LENGTH && !isExpanded;
  const displayContent = shouldTruncate ? content.substring(0, MAX_LENGTH) + '...' : content;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link to={`/profile/${authorId}`} className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={authorAvatar} alt={authorName} />
              <AvatarFallback>{authorName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold hover:underline">{authorName}</p>
              <p className="text-sm text-muted-foreground">{getTimeAgo(createdAt)}</p>
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={toggleSave} className="gap-2">
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? 'Retirer des favoris' : 'Enregistrer'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink} className="gap-2">
                <Copy className="h-4 w-4" /> Copier le lien
              </DropdownMenuItem>
              {!isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={reportPost} className="gap-2 text-destructive">
                    <Flag className="h-4 w-4" /> Signaler
                  </DropdownMenuItem>
                </>
              )}
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={deletePost} className="gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {title && <h3 className="text-xl font-bold text-foreground">{title}</h3>}
        {hook && <p className="text-lg italic text-muted-foreground border-l-4 border-primary pl-3">{hook}</p>}

        {displayContent && (
          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: displayContent }} />
        )}
        {shouldTruncate && (
          <button onClick={() => setIsExpanded(true)} className="text-primary text-sm font-medium hover:underline">
            Voir plus
          </button>
        )}

        {renderMedia()}

        {safeLinks.length > 0 && (
          <div className="space-y-1">
            {safeLinks.map((link, index) => (
              <a key={index} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm">
                <ExternalLink className="w-3 h-3" />{link}
              </a>
            ))}
          </div>
        )}

        {safeHashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {safeHashtags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-primary cursor-pointer hover:bg-primary/20">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <div className="flex items-center justify-between w-full border-t pt-3">
          <ReactionPicker postId={id} />
          <Button variant="ghost" size="sm" onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }} className="gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>{commentCount}</span>
          </Button>
          <ShareButton postId={id} content={content?.substring(0, 100) || ''} />
          <Button variant="ghost" size="icon" onClick={toggleSave} className="h-8 w-8">
            {isSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
          </Button>
        </div>

        {showComments && (
          <div className="w-full space-y-3 border-t pt-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.profiles?.avatar_url} />
                  <AvatarFallback>{comment.profiles?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted rounded-lg p-2">
                  <p className="text-sm font-medium">{comment.profiles?.full_name}</p>
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
            {user && (
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Écrire un commentaire..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <Button onClick={handleAddComment} size="sm">Envoyer</Button>
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default EnhancedPostCard;
