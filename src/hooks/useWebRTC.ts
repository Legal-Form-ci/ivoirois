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
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

export type WebRTCDiagnosticStep = {
  step: string;
  status: "pending" | "ok" | "error" | "info";
  message?: string;
  at: number;
};

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
  const [diagnostics, setDiagnostics] = useState<WebRTCDiagnosticStep[]>([]);
  const [iceState, setIceState] = useState<RTCIceConnectionState | "idle">("idle");
  const [connState, setConnState] = useState<RTCPeerConnectionState | "idle">("idle");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const isCallerRef = useRef<boolean>(false);
  const restartAttemptsRef = useRef<number>(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const log = useCallback(
    (step: string, status: WebRTCDiagnosticStep["status"], message?: string) => {
      const entry = { step, status, message, at: Date.now() };
      // eslint-disable-next-line no-console
      console.log(`[WebRTC] ${status.toUpperCase()} ${step}${message ? " — " + message : ""}`);
      setDiagnostics((d) => [...d.slice(-49), entry]);
    },
    []
  );

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

          log("signal:received", "info", signal.signal_type);
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
      log("ontrack", "ok", `${event.track.kind}`);
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      setIceState(s);
      log("iceConnectionState", s === "failed" || s === "disconnected" ? "error" : "info", s);
      if (s === "failed" || s === "disconnected") {
        scheduleIceRestart();
      } else if (s === "connected" || s === "completed") {
        restartAttemptsRef.current = 0;
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      setConnState(s);
      log("connectionState", s === "failed" ? "error" : "info", s);
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
      } else if (pc.connectionState === "failed") {
        // Try ICE restart instead of immediately ending
        scheduleIceRestart();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [conversationId, remoteUserId, log]);

  const scheduleIceRestart = useCallback(() => {
    if (!isCallerRef.current) return; // Only caller initiates restart
    if (restartTimerRef.current) return;
    if (restartAttemptsRef.current >= 3) {
      log("ice-restart", "error", "Trop de tentatives, fin d'appel");
      handleCallEnd();
      return;
    }
    restartAttemptsRef.current += 1;
    log("ice-restart", "info", `tentative #${restartAttemptsRef.current}`);
    restartTimerRef.current = setTimeout(async () => {
      restartTimerRef.current = null;
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        await sendSignal("offer", offer);
        log("ice-restart", "ok", "offer renvoyée");
      } catch (e: any) {
        log("ice-restart", "error", e?.message);
      }
    }, 1500);
  }, [log]);

  const startCall = async () => {
    try {
      setCallStatus("calling");
      isCallerRef.current = true;
      log("startCall", "info");

      let stream: MediaStream;
      try {
        log("getUserMedia", "pending");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isAudioOnly
            ? false
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        log("getUserMedia", "ok", `${stream.getTracks().map(t => t.kind).join(",")}`);
      } catch (mediaError: any) {
        log("getUserMedia", "error", mediaError?.name + ": " + mediaError?.message);
        const msg = mediaError.name === 'NotAllowedError'
          ? "Accès micro/caméra refusé. Vérifiez les permissions."
          : mediaError.name === 'NotFoundError'
          ? "Aucun micro/caméra détecté."
          : "Impossible d'accéder au micro/caméra.";
        toast.error(msg);
        setCallStatus("idle");
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = initializePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      log("offer", "ok", "envoyée");

      await sendSignal("offer", offer);
      toast.info("Appel en cours...");
    } catch (error: any) {
      log("startCall", "error", error?.message);
      toast.error("Erreur lors du démarrage de l'appel");
      handleCallEnd();
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      log("handleOffer", "info");
      // For ICE restart, peer connection already exists with media
      let pc = peerConnectionRef.current;
      if (pc && localStreamRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", answer);
        log("answer", "ok", "ICE restart");
        return;
      }

      log("getUserMedia", "pending");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isAudioOnly
          ? false
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      log("getUserMedia", "ok");

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      pc = initializePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal("answer", answer);
      log("answer", "ok");
    } catch (error: any) {
      log("handleOffer", "error", error?.message);
      rejectCall();
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        log("setRemoteDescription(answer)", "ok");
      }
    } catch (error: any) {
      log("handleAnswer", "error", error?.message);
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
      log("addIceCandidate", "error", error?.message);
    }
  };

  const acceptCall = async () => {
    // Answer was already sent in handleOffer; confirm UI state
    if (callStatus === "receiving") {
      setCallStatus("connected");
      toast.success("Appel connecté");
    }
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
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
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
    log("handleCallEnd", "info");
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
  };
};
