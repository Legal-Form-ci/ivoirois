import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
  Activity,
  Send,
  Star,
  UserPlus,
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
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [callMessage, setCallMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingSent, setRatingSent] = useState(false);
  const callIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();

  const {
    callStatus,
    isLocalMuted,
    isVideoEnabled,
    isRemoteMuted,
    isRemoteVideoEnabled,
    callMessages,
    localStream,
    remoteStream,
    diagnostics,
    iceState,
    connState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    requestRemoteMute,
    requestRemoteVideoOff,
    sendCallMessage,
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

  useEffect(() => {
    callMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [callMessages.length]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus, remoteVideoRef]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus, localVideoRef]);

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

  const handleSendCallMessage = async () => {
    const clean = callMessage.trim();
    if (!clean) return;
    setCallMessage("");
    await sendCallMessage(clean);
  };

  const submitRating = async (value: number) => {
    setRating(value);
    if (!user?.id || ratingSent) return;
    const { error } = await supabase.from("call_ratings" as any).insert({
      conversation_id: conversationId,
      rated_by: user.id,
      rated_user: remoteUserId,
      rating: value,
      note: `Qualité ${isAudioOnly ? "audio" : "vidéo"} · durée ${formatDuration(callDuration)}`,
    });
    if (error) {
      toast.error("Impossible d'enregistrer la note de l'appel");
      return;
    }
    setRatingSent(true);
    toast.success("Merci, votre note d'appel est enregistrée");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="h-[94dvh] w-[calc(100vw-0.5rem)] max-w-5xl p-0 gap-0 bg-background/95 backdrop-blur overflow-hidden sm:w-full">
        <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
          {/* Remote Video / Avatar */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted">
            {!isAudioOnly && callStatus === "connected" ? (
              <video
                ref={(el) => {
                  if (el) (remoteVideoRef as any).current = el;
                }}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
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
              <div className="absolute bottom-4 right-4 h-24 w-32 overflow-hidden rounded-lg border-2 border-background shadow-lg sm:h-36 sm:w-48">
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

            {callStatus === "connected" && (
              <div className="absolute left-4 top-16 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-background/80 px-3 py-1">Micro distant: {isRemoteMuted ? "coupé" : "actif"}</span>
                {!isAudioOnly && <span className="rounded-full bg-background/80 px-3 py-1">Caméra distante: {isRemoteVideoEnabled ? "active" : "coupée"}</span>}
              </div>
            )}

            {/* Diagnostic toggle */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 rounded-full h-10 w-10 opacity-80 hover:opacity-100"
              onClick={() => setShowDiagnostics((v) => !v)}
              title="Diagnostic WebRTC"
            >
              <Activity className="h-4 w-4" />
            </Button>

            {showDiagnostics && (
              <div className="absolute top-16 right-4 w-80 max-h-96 overflow-y-auto rounded-lg bg-background/95 backdrop-blur border p-3 text-xs space-y-1 shadow-hover">
                <div className="flex items-center justify-between font-semibold pb-2 border-b">
                  <span>Diagnostic WebRTC</span>
                  <span className="font-mono text-[10px]">
                    ICE:{iceState} · PC:{connState}
                  </span>
                </div>
                {diagnostics.length === 0 && (
                  <p className="text-muted-foreground">En attente d'événements…</p>
                )}
                {diagnostics.map((d, i) => (
                  <div key={i} className="flex gap-2 font-mono">
                    <span
                      className={
                        d.status === "ok"
                          ? "text-secondary"
                          : d.status === "error"
                          ? "text-destructive"
                          : d.status === "pending"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      ●
                    </span>
                    <span className="flex-1 break-all">
                      <span className="font-semibold">{d.step}</span>
                      {d.message ? <span className="text-muted-foreground"> — {d.message}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live call chat under the video */}
          {callStatus === "connected" && (
            <div className="shrink-0 border-t bg-card/95 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Messages pendant l'appel</p>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => toast.info("Ajout de participants bientôt disponible via invitation sécurisée") }>
                  <UserPlus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>
              <ScrollArea className="h-24 rounded-lg border bg-background p-2">
                <div className="space-y-2 pr-2">
                  {callMessages.length === 0 && <p className="text-center text-xs text-muted-foreground">Aucun message d'appel pour le moment.</p>}
                  {callMessages.map((message) => {
                    const own = message.senderId === user?.id;
                    return (
                      <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm ${own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="break-words">{message.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={callMessagesEndRef} />
                </div>
              </ScrollArea>
              <div className="mt-2 flex gap-2">
                <Input
                  value={callMessage}
                  onChange={(event) => setCallMessage(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSendCallMessage()}
                  placeholder="Écrire sous la vidéo..."
                  className="min-w-0"
                />
                <Button size="icon" onClick={handleSendCallMessage} disabled={!callMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Controls */}
          {(callStatus === "connected" || callStatus === "calling") && (
            <div className="shrink-0 border-t bg-background/95 p-3 backdrop-blur-sm sm:p-4">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
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

                {callStatus === "connected" && (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-full h-14 w-14"
                      onClick={requestRemoteMute}
                      title="Couper le micro distant"
                    >
                      <MicOff className="h-6 w-6" />
                    </Button>

                    {!isAudioOnly && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full h-14 w-14"
                        onClick={requestRemoteVideoOff}
                        title="Couper la caméra distante"
                      >
                        <VideoOff className="h-6 w-6" />
                      </Button>
                    )}
                  </>
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
              {callStatus === "connected" && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">
                  <span className="mr-1">Noter la qualité :</span>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="rounded-full p-1 text-primary disabled:opacity-60"
                      disabled={ratingSent}
                      onClick={() => submitRating(value)}
                    >
                      <Star className={`h-4 w-4 ${value <= rating ? "fill-current" : ""}`} />
                    </button>
                  ))}
                  {ratingSent && <span className="ml-1">Note enregistrée</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebRTCCall;
