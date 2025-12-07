import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Maximize2,
  Minimize2,
  Camera,
  Volume2,
  VolumeX
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VideoCallProps {
  open: boolean;
  onClose: () => void;
  recipientName: string;
  recipientAvatar?: string;
  isAudioOnly?: boolean;
  onCallEnd?: () => void;
}

const VideoCall = ({ 
  open, 
  onClose, 
  recipientName, 
  recipientAvatar,
  isAudioOnly = false,
  onCallEnd 
}: VideoCallProps) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!isAudioOnly);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      initializeCall();
    }
    return () => {
      cleanup();
    };
  }, [open]);

  useEffect(() => {
    if (callStatus === 'connected') {
      callIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    };
  }, [callStatus]);

  const initializeCall = async () => {
    try {
      const constraints = {
        audio: true,
        video: isAudioOnly ? false : {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && !isAudioOnly) {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate connection delay
      setTimeout(() => {
        setCallStatus('connected');
        toast.success(`Connecté avec ${recipientName}`);
      }, 2000);

    } catch (error: any) {
      console.error("Error accessing media devices:", error);
      if (error.name === 'NotAllowedError') {
        toast.error("Veuillez autoriser l'accès à la caméra et au microphone");
      } else if (error.name === 'NotFoundError') {
        toast.error("Caméra ou microphone non trouvé");
      } else {
        toast.error("Erreur lors de l'initialisation de l'appel");
      }
      handleEndCall();
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
    }
    setCallDuration(0);
    setCallStatus('connecting');
  };

  const handleEndCall = () => {
    cleanup();
    setCallStatus('ended');
    onCallEnd?.();
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleEndCall()}>
      <DialogContent className={`${isFullscreen ? 'max-w-full h-screen m-0 rounded-none' : 'max-w-4xl'} p-0 gap-0 bg-background/95 backdrop-blur`}>
        <DialogHeader className="sr-only">
          <DialogTitle>Appel {isAudioOnly ? 'audio' : 'vidéo'} avec {recipientName}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-full min-h-[400px] flex flex-col">
          {/* Remote Video / Avatar */}
          <div className="flex-1 relative bg-muted flex items-center justify-center">
            {!isAudioOnly && callStatus === 'connected' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-4 border-primary/20">
                  <AvatarImage src={recipientAvatar} />
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {recipientName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold">{recipientName}</h2>
                {callStatus === 'connecting' && (
                  <p className="text-muted-foreground animate-pulse">Connexion en cours...</p>
                )}
                {callStatus === 'connected' && (
                  <p className="text-primary font-medium">{formatDuration(callDuration)}</p>
                )}
              </div>
            )}

            {/* Call Status Indicator */}
            {callStatus === 'connecting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 animate-pulse">
                      <AvatarImage src={recipientAvatar} />
                      <AvatarFallback className="text-3xl">
                        {recipientName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping" />
                  </div>
                  <p className="text-lg">Appel de {recipientName}...</p>
                  <div className="flex gap-4">
                    <Button
                      variant="destructive"
                      size="lg"
                      className="rounded-full h-14 w-14"
                      onClick={handleEndCall}
                    >
                      <PhoneOff className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Local Video Preview */}
            {!isAudioOnly && isVideoEnabled && callStatus === 'connected' && (
              <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-lg overflow-hidden shadow-lg border-2 border-background">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Call Duration */}
            {callStatus === 'connected' && !isAudioOnly && (
              <div className="absolute top-4 left-4 bg-background/80 rounded-full px-4 py-2">
                <p className="text-sm font-medium">{formatDuration(callDuration)}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          {callStatus === 'connected' && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>

                {!isAudioOnly && (
                  <Button
                    variant={isVideoEnabled ? "secondary" : "destructive"}
                    size="lg"
                    className="rounded-full h-14 w-14"
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-16 w-16"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>

                <Button
                  variant={isSpeakerOn ? "secondary" : "outline"}
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                >
                  {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCall;
