import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Users, MessageSquare, ScreenShare, Settings,
  PlusCircle, Crown, Volume2, VolumeX
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isHost: boolean;
  stream?: MediaStream;
}

interface GroupVideoCallProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  isHost?: boolean;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Helper component to handle video stream
const ParticipantVideo = ({ stream, muted, isLocal }: { stream: MediaStream; muted: boolean; isLocal: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-cover"
    />
  );
};

const GroupVideoCall = ({
  open,
  onClose,
  groupId,
  groupName,
  isHost = false,
}: GroupVideoCallProps) => {
  const { user, profile } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize local media
  useEffect(() => {
    if (open) {
      initializeMedia();
      joinGroupCall();
      
      callIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      cleanup();
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    };
  }, [open]);

  // Subscribe to group call signals
  useEffect(() => {
    if (!open || !user) return;

    const channel = supabase
      .channel(`group-call-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `conversation_id=eq.${groupId}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          if (signal.caller_id === user.id) return;
          await handleSignal(signal);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user, groupId]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add self as participant
      if (user && profile) {
        setParticipants([{
          id: user.id,
          name: profile.full_name || 'Vous',
          avatar: profile.avatar_url || undefined,
          isMuted: false,
          isVideoOn: true,
          isHost,
          stream,
        }]);
      }
    } catch (error) {
      console.error('[GroupVideoCall] Media error:', error);
      toast.error('Erreur accès caméra/micro');
    }
  };

  const joinGroupCall = async () => {
    if (!user) return;

    // Broadcast join signal
    await supabase.from('call_signals').insert([{
      caller_id: user.id,
      callee_id: user.id, // Self for group calls
      conversation_id: groupId,
      signal_type: 'group-join',
      signal_data: {
        name: profile?.full_name,
        avatar: profile?.avatar_url,
      },
    }]);
  };

  const handleSignal = async (signal: any) => {
    switch (signal.signal_type) {
      case 'group-join':
        // New participant joined
        await handleNewParticipant(signal);
        break;
      case 'group-offer':
        await handleOffer(signal);
        break;
      case 'group-answer':
        await handleAnswer(signal);
        break;
      case 'group-ice-candidate':
        await handleIceCandidate(signal);
        break;
      case 'group-leave':
        handleParticipantLeave(signal.caller_id);
        break;
    }
  };

  const handleNewParticipant = async (signal: any) => {
    const newParticipant: Participant = {
      id: signal.caller_id,
      name: signal.signal_data?.name || 'Participant',
      avatar: signal.signal_data?.avatar,
      isMuted: false,
      isVideoOn: true,
      isHost: false,
    };

    setParticipants(prev => {
      if (prev.find(p => p.id === newParticipant.id)) return prev;
      return [...prev, newParticipant];
    });

    // Create peer connection for new participant
    if (localStream && user && signal.caller_id !== user.id) {
      await createPeerConnection(signal.caller_id, true);
    }
  };

  const createPeerConnection = async (participantId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && user) {
        supabase.from('call_signals').insert([{
          caller_id: user.id,
          callee_id: participantId,
          conversation_id: groupId,
          signal_type: 'group-ice-candidate',
          signal_data: JSON.parse(JSON.stringify(event.candidate.toJSON())),
        }]);
      }
    };

    pc.ontrack = (event) => {
      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { ...p, stream: event.streams[0] } : p
      ));
    };

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    peerConnections.current.set(participantId, pc);

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (user) {
        await supabase.from('call_signals').insert([{
          caller_id: user.id,
          callee_id: participantId,
          conversation_id: groupId,
          signal_type: 'group-offer',
          signal_data: JSON.parse(JSON.stringify(offer)),
        }]);
      }
    }

    return pc;
  };

  const handleOffer = async (signal: any) => {
    let pc = peerConnections.current.get(signal.caller_id);
    if (!pc) {
      pc = await createPeerConnection(signal.caller_id, false);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (user) {
      await supabase.from('call_signals').insert([{
        caller_id: user.id,
        callee_id: signal.caller_id,
        conversation_id: groupId,
        signal_type: 'group-answer',
        signal_data: JSON.parse(JSON.stringify(answer)),
      }]);
    }
  };

  const handleAnswer = async (signal: any) => {
    const pc = peerConnections.current.get(signal.caller_id);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
    }
  };

  const handleIceCandidate = async (signal: any) => {
    const pc = peerConnections.current.get(signal.caller_id);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
    }
  };

  const handleParticipantLeave = (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    
    const pc = peerConnections.current.get(participantId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(participantId);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing, restore camera
      await initializeMedia();
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        setLocalStream(screenStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Replace tracks in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        setIsScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } catch (error) {
        console.error('[GroupVideoCall] Screen share error:', error);
        toast.error('Erreur lors du partage d\'écran');
      }
    }
  };

  const leaveCall = async () => {
    if (user) {
      await supabase.from('call_signals').insert([{
        caller_id: user.id,
        callee_id: user.id,
        conversation_id: groupId,
        signal_type: 'group-leave',
        signal_data: {},
      }]);
    }
    
    cleanup();
    onClose();
  };

  const cleanup = () => {
    localStream?.getTracks().forEach(track => track.stop());
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setLocalStream(null);
    setParticipants([]);
    setCallDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getGridClass = () => {
    const count = participants.length;
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    return 'grid-cols-4 grid-rows-3';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && leaveCall()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 bg-background overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">{groupName}</h2>
                <p className="text-sm text-muted-foreground">
                  {participants.length} participant{participants.length > 1 ? 's' : ''} • {formatDuration(callDuration)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                En direct
              </Badge>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 p-4 bg-black/95">
            <div className={`grid ${getGridClass()} gap-2 h-full`}>
              {participants.map((participant) => (
                <div 
                  key={participant.id} 
                  className="relative rounded-lg overflow-hidden bg-muted/10 border border-white/10"
                >
                  {participant.stream && participant.isVideoOn ? (
                    <ParticipantVideo 
                      stream={participant.stream}
                      muted={participant.id === user?.id}
                      isLocal={participant.id === user?.id}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Avatar className="h-20 w-20 border-4 border-white/20">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="text-2xl">
                          {participant.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  
                  {/* Participant overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">
                          {participant.id === user?.id ? 'Vous' : participant.name}
                        </span>
                        {participant.isHost && (
                          <Crown className="h-4 w-4 text-yellow-400" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        {participant.isMuted && (
                          <MicOff className="h-4 w-4 text-red-400" />
                        )}
                        {!participant.isVideoOn && (
                          <VideoOff className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 p-4 border-t bg-muted/50">
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            <Button
              variant={isVideoOn ? 'secondary' : 'destructive'}
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={toggleVideo}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>

            <Button
              variant={isScreenSharing ? 'default' : 'secondary'}
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={toggleScreenShare}
            >
              <ScreenShare className="h-6 w-6" />
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="h-6 w-6" />
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full h-16 w-16"
              onClick={leaveCall}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupVideoCall;
