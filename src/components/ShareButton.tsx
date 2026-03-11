import { Share2, Copy, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ShareButtonProps {
  postId: string;
  content: string;
}

const ShareButton = ({ postId, content }: ShareButtonProps) => {
  const { user } = useAuth();
  const shareUrl = `${window.location.origin}/post/${postId}`;
  const shareText = content.substring(0, 100) + (content.length > 100 ? '...' : '');

  const recordShare = async (type: string) => {
    if (!user) return;
    try {
      await supabase.from('post_shares').insert({
        post_id: postId,
        user_id: user.id,
        share_type: type,
      });
    } catch (e) {
      // silent
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Lien copié !');
    recordShare('copy');
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`, '_blank');
    recordShare('whatsapp');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    recordShare('facebook');
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    recordShare('twitter');
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    recordShare('linkedin');
  };

  const shareOnTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    recordShare('telegram');
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Publication Ivoi\'Rois', text: shareText, url: shareUrl });
        recordShare('native');
      } catch (e) {
        // User cancelled
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          <span className="text-sm">Partager</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {navigator.share && (
          <>
            <DropdownMenuItem onClick={nativeShare} className="gap-3">
              <Share2 className="h-4 w-4" /> Partager...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={shareOnWhatsApp} className="gap-3">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnFacebook} className="gap-3">
          <Share2 className="h-4 w-4" /> Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnTwitter} className="gap-3">
          <Share2 className="h-4 w-4" /> Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnLinkedIn} className="gap-3">
          <Share2 className="h-4 w-4" /> LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnTelegram} className="gap-3">
          <Send className="h-4 w-4" /> Telegram
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyToClipboard} className="gap-3">
          <Copy className="h-4 w-4" /> Copier le lien
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareButton;
