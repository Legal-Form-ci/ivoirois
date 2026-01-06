import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';

interface IncomingCall {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  conversationId: string;
  callType: 'audio' | 'video';
  signalData: any;
}

export const useIncomingCallDetection = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to call signals for this user
    const channel = supabase
      .channel(`calls-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `callee_id=eq.${user.id}`
        },
        async (payload) => {
          const signal = payload.new;
          
          if (signal.signal_type === 'offer') {
            // Fetch caller profile
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', signal.caller_id)
              .single();

            // Determine call type from signal data
            const signalData = signal.signal_data as any;
            const callType = signalData?.type === 'video' ? 'video' : 'audio';

            setIncomingCall({
              callerId: signal.caller_id,
              callerName: callerProfile?.full_name || 'Utilisateur inconnu',
              callerAvatar: callerProfile?.avatar_url || undefined,
              conversationId: signal.conversation_id || '',
              callType,
              signalData: signal.signal_data
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const acceptCall = () => {
    if (incomingCall) {
      // Navigate to conversation with call active
      window.location.href = `/messages/${incomingCall.conversationId}?call=true&callerId=${incomingCall.callerId}`;
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (incomingCall && user) {
      // Send rejection signal
      await supabase.from('call_signals').insert({
        caller_id: user.id,
        callee_id: incomingCall.callerId,
        conversation_id: incomingCall.conversationId,
        signal_type: 'reject',
        signal_data: { reason: 'declined' }
      });
      
      setIncomingCall(null);
    }
  };

  return {
    incomingCall,
    acceptCall,
    rejectCall
  };
};

// Wrapper component to use in App
export const IncomingCallHandler = () => {
  const { incomingCall, acceptCall, rejectCall } = useIncomingCallDetection();

  if (!incomingCall) return null;

  return (
    <IncomingCallOverlay
      callerName={incomingCall.callerName}
      callerAvatar={incomingCall.callerAvatar}
      callType={incomingCall.callType}
      onAccept={acceptCall}
      onReject={rejectCall}
    />
  );
};
