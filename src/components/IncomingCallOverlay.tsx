import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallOverlayProps {
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallOverlay = ({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject
}: IncomingCallOverlayProps) => {
  const [isRinging, setIsRinging] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create ringtone audio
    audioRef.current = new Audio('/ringtone.mp3');
    audioRef.current.loop = true;
    
    // Play ringtone
    audioRef.current.play().catch(console.error);
    
    // Vibrate if supported
    if ('vibrate' in navigator) {
      const vibratePattern = [500, 200, 500, 200, 500];
      const vibrateInterval = setInterval(() => {
        navigator.vibrate(vibratePattern);
      }, 2000);
      
      return () => {
        clearInterval(vibrateInterval);
        navigator.vibrate(0);
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    navigator.vibrate?.(0);
    onAccept();
  };

  const handleReject = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    navigator.vibrate?.(0);
    onReject();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-primary/90 to-primary flex flex-col items-center justify-center animate-fade-in">
      {/* Pulsing ring effect */}
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-white/30 scale-150" />
        <div className="absolute inset-0 animate-pulse rounded-full bg-white/20 scale-125" />
        <Avatar className="w-32 h-32 border-4 border-white shadow-2xl relative z-10">
          <AvatarImage src={callerAvatar} alt={callerName} />
          <AvatarFallback className="text-4xl bg-white/20 text-white">
            {callerName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Caller info */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-2">{callerName}</h2>
        <p className="text-white/80 text-lg flex items-center justify-center gap-2">
          {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          Appel {callType === 'video' ? 'vidéo' : 'audio'} entrant...
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-16">
        <Button
          onClick={handleReject}
          size="lg"
          className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
        >
          <PhoneOff className="w-8 h-8" />
        </Button>
        
        <Button
          onClick={handleAccept}
          size="lg"
          className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 shadow-lg animate-bounce"
        >
          {callType === 'video' ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
        </Button>
      </div>

      {/* Swipe hint */}
      <p className="absolute bottom-8 text-white/60 text-sm">
        Glissez pour répondre ou refuser
      </p>
    </div>
  );
};

export default IncomingCallOverlay;
