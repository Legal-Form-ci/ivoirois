import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import appLogo from "@/assets/app-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Vérifier si l'utilisateur a déjà reporté l'installation
      const hasPostponed = localStorage.getItem('installPostponed');
      if (!hasPostponed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Enregistrer le service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker enregistré'))
        .catch((err) => console.error('Erreur Service Worker:', err));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Application installée');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.removeItem('installPostponed');
  };

  const handlePostpone = () => {
    setShowPrompt(false);
    localStorage.setItem('installPostponed', 'true');
    
    // Proposer à nouveau après 7 jours
    setTimeout(() => {
      localStorage.removeItem('installPostponed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
        <CardContent className="pt-6">
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePostpone}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-4">
            <img 
              src={appLogo} 
              alt="Ivoi'Rois" 
              className="h-20 w-20 rounded-2xl shadow-lg"
            />
            
            <div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Installer Ivoi'Rois
              </h2>
              <p className="text-muted-foreground">
                Installez l'application sur votre appareil pour un accès rapide et une meilleure expérience !
              </p>
            </div>

            <div className="flex flex-col w-full gap-2 pt-4">
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full"
              >
                Installer maintenant
              </Button>
              <Button
                onClick={handlePostpone}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Plus tard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPrompt;
