import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneIncoming,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useState } from "react";

interface WebRTCCallProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  remoteUserId: string;
  remoteUserName: string;
  remoteUserAvatar?: string;
  isAudioOnly?: boolean;
  isIncoming?: boolean;
}

const WebRTCCall = ({
  open,
  onClose,
  conversationId,
  remoteUserId,
  remoteUserName,
  remoteUserAvatar,
  isAudioOnly = false,
  isIncoming = false,
}: WebRTCCallProps) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    callStatus,
    isLocalMuted,
    isVideoEnabled,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC({
    conversationId,
    remoteUserId,
    isAudioOnly,
    onCallEnd: onClose,
  });

  useEffect(() => {
    if (open && !isIncoming) {
      startCall();
    }
  }, [open, isIncoming]);

  useEffect(() => {
    if (callStatus === "connected") {
      callIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    };
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClose = () => {
    if (callStatus === "connected" || callStatus === "calling") {
      endCall();
    } else {
      rejectCall();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl p-0 gap-0 bg-background/95 backdrop-blur overflow-hidden">
        <div className="relative w-full min-h-[500px] flex flex-col">
          {/* Remote Video / Avatar */}
          <div className="flex-1 relative bg-muted flex items-center justify-center">
            {!isAudioOnly && callStatus === "connected" ? (
              <video
                ref={(el) => {
                  if (el) (remoteVideoRef as any).current = el;
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-4 border-primary/20">
                  <AvatarImage src={remoteUserAvatar} />
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {remoteUserName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold">{remoteUserName}</h2>

                {callStatus === "calling" && (
                  <p className="text-muted-foreground animate-pulse">
                    Appel en cours...
                  </p>
                )}
                {callStatus === "receiving" && (
                  <p className="text-primary animate-pulse">Appel entrant...</p>
                )}
                {callStatus === "connected" && (
                  <p className="text-primary font-medium">
                    {formatDuration(callDuration)}
                  </p>
                )}
              </div>
            )}

            {/* Incoming call overlay */}
            {callStatus === "receiving" && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 animate-pulse">
                      <AvatarImage src={remoteUserAvatar} />
                      <AvatarFallback className="text-3xl">
                        {remoteUserName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping" />
                  </div>
                  <p className="text-lg font-medium">
                    {remoteUserName} vous appelle...
                  </p>
                  <div className="flex gap-6">
                    <Button
                      variant="destructive"
                      size="lg"
                      className="rounded-full h-16 w-16"
                      onClick={rejectCall}
                    >
                      <PhoneOff className="h-7 w-7" />
                    </Button>
                    <Button
                      size="lg"
                      className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600"
                      onClick={acceptCall}
                    >
                      <PhoneIncoming className="h-7 w-7" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Local Video Preview */}
            {!isAudioOnly && isVideoEnabled && callStatus === "connected" && (
              <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-lg overflow-hidden shadow-lg border-2 border-background">
                <video
                  ref={(el) => {
                    if (el) (localVideoRef as any).current = el;
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Call Duration */}
            {callStatus === "connected" && !isAudioOnly && (
              <div className="absolute top-4 left-4 bg-background/80 rounded-full px-4 py-2">
                <p className="text-sm font-medium">{formatDuration(callDuration)}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          {(callStatus === "connected" || callStatus === "calling") && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={isLocalMuted ? "destructive" : "secondary"}
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={toggleMute}
                >
                  {isLocalMuted ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>

                {!isAudioOnly && (
                  <Button
                    variant={isVideoEnabled ? "secondary" : "destructive"}
                    size="lg"
                    className="rounded-full h-14 w-14"
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? (
                      <Video className="h-6 w-6" />
                    ) : (
                      <VideoOff className="h-6 w-6" />
                    )}
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-16 w-16"
                  onClick={endCall}
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>

                <Button
                  variant={isSpeakerOn ? "secondary" : "outline"}
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                >
                  {isSpeakerOn ? (
                    <Volume2 className="h-6 w-6" />
                  ) : (
                    <VolumeX className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebRTCCall;
