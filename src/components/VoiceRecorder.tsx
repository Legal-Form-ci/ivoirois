import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Send, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void | Promise<void>;
  onCancel?: () => void;
}

const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSend = async () => {
    if (!audioBlob || isSending) return;
    setIsSending(true);
    try {
      await onSend(audioBlob, recordingTime);
      reset();
    } finally {
      setIsSending(false);
    }
  };

  const reset = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="mobile-audio-control flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-muted p-2 sm:max-w-md sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={togglePlayback}
          disabled={isSending}
          aria-label={isPlaying ? 'Pause vocal' : 'Lire vocal'}
          className="shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <audio
          src={audioUrl}
          controls
          preload="metadata"
          className="h-10 min-w-0 flex-1 rounded-full"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        <span className="shrink-0 text-center text-sm text-muted-foreground sm:min-w-[44px]">
          {formatTime(recordingTime)}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={reset}
          disabled={isSending}
          className="text-destructive"
          aria-label="Supprimer le vocal"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={isSending}
          aria-label="Envoyer le vocal"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {isRecording ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg bg-destructive/10 p-2">
          <div className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-destructive" />
          <span className="min-w-0 flex-1 text-sm font-medium text-destructive">
            Enregistrement... {formatTime(recordingTime)}
          </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="shrink-0"
          >
            <Square className="w-4 h-4 mr-1" />
            Arrêter
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={startRecording}
          title="Message vocal"
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};

export default VoiceRecorder;
