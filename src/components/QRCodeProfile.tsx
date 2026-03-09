import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeProfileProps {
  profileId: string;
  fullName: string;
  avatarUrl?: string;
}

const QRCodeProfile = ({ profileId, fullName, avatarUrl }: QRCodeProfileProps) => {
  const [open, setOpen] = useState(false);
  const profileUrl = `${window.location.origin}/profile/${profileId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success('Lien copié !');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Profil de ${fullName} - Ivoi'Rois`,
          text: `Découvrez le profil de ${fullName} sur Ivoi'Rois`,
          url: profileUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `qr-${fullName.replace(/\s+/g, '-')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      toast.success('QR Code téléchargé !');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <QrCode className="h-4 w-4" />
        QR Code
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Mon QR Code</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <QRCodeSVG
                id="qr-code-svg"
                value={profileUrl}
                size={200}
                level="H"
                includeMargin
                imageSettings={avatarUrl ? {
                  src: avatarUrl,
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                } : undefined}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scannez ce code pour accéder au profil de <strong>{fullName}</strong>
            </p>

            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleCopy} className="flex-1 gap-2">
                <Copy className="h-4 w-4" />
                Copier
              </Button>
              <Button variant="outline" onClick={handleDownload} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
              <Button onClick={handleShare} className="flex-1 gap-2">
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QRCodeProfile;
