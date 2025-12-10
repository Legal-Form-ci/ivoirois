import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UseWebRTCOptions {
  conversationId: string;
  remoteUserId: string;
  isAudioOnly?: boolean;
  onCallEnd?: () => void;
}

interface CallSignal {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  signal_type: string;
  signal_data: any;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const useWebRTC = ({
  conversationId,
  remoteUserId,
  isAudioOnly = false,
  onCallEnd,
}: UseWebRTCOptions) => {
  const { user } = useAuth();
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "receiving" | "connected" | "ended"
  >("idle");
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!isAudioOnly);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Setup signaling channel
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    const channel = supabase
      .channel(`call-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const signal = payload.new as CallSignal;
          if (signal.caller_id === user.id) return; // Ignore own signals

          console.log("Received signal:", signal.signal_type);
          await handleSignal(signal);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversationId]);

  const handleSignal = async (signal: CallSignal) => {
    switch (signal.signal_type) {
      case "offer":
        setCallStatus("receiving");
        await handleOffer(signal.signal_data);
        break;
      case "answer":
        await handleAnswer(signal.signal_data);
        break;
      case "ice-candidate":
        await handleIceCandidate(signal.signal_data);
        break;
      case "call-end":
      case "call-reject":
        handleCallEnd();
        break;
    }
  };

  const sendSignal = async (type: string, data: any) => {
    if (!user?.id) return;

    await supabase.from("call_signals" as any).insert({
      conversation_id: conversationId,
      caller_id: user.id,
      callee_id: remoteUserId,
      signal_type: type,
      signal_data: data,
    });
  };

  const initializePeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track");
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        handleCallEnd();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [conversationId, remoteUserId]);

  const startCall = async () => {
    try {
      setCallStatus("calling");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isAudioOnly
          ? false
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = initializePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendSignal("offer", offer);
      toast.info("Appel en cours...");
    } catch (error: any) {
      console.error("Error starting call:", error);
      toast.error("Erreur lors du démarrage de l'appel");
      handleCallEnd();
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isAudioOnly
          ? false
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = initializePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal("answer", answer);
    } catch (error: any) {
      console.error("Error handling offer:", error);
      rejectCall();
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    } catch (error: any) {
      console.error("Error handling answer:", error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (error: any) {
      console.error("Error handling ICE candidate:", error);
    }
  };

  const acceptCall = async () => {
    // The call is automatically accepted when we send the answer
    setCallStatus("connected");
    toast.success("Appel connecté");
  };

  const rejectCall = async () => {
    await sendSignal("call-reject", {});
    handleCallEnd();
  };

  const endCall = async () => {
    await sendSignal("call-end", {});
    handleCallEnd();
  };

  const handleCallEnd = () => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());

    // Close peer connection
    peerConnectionRef.current?.close();

    // Reset refs
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    peerConnectionRef.current = null;

    setCallStatus("ended");
    onCallEnd?.();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isLocalMuted;
      });
      setIsLocalMuted(!isLocalMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return {
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
  };
};
