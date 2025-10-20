import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ShareButtonProps {
  postId: string;
  content: string;
}

const ShareButton = ({ postId, content }: ShareButtonProps) => {
  const shareUrl = `${window.location.origin}/post/${postId}`;
  const shareText = content.substring(0, 100) + (content.length > 100 ? '...' : '');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Lien copié !');
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Share2 className="h-5 w-5" />
          <span className="text-sm">Partager</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyToClipboard}>
          Copier le lien
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnWhatsApp}>
          Partager sur WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnFacebook}>
          Partager sur Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnTwitter}>
          Partager sur Twitter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareButton;
