import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Send, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
}

const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
      reset();
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
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={togglePlayback}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        {/* Waveform placeholder */}
        <div className="flex-1 h-8 bg-primary/20 rounded flex items-center justify-center">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full"
                style={{ height: `${Math.random() * 20 + 8}px` }}
              />
            ))}
          </div>
        </div>

        <span className="text-sm text-muted-foreground min-w-[40px]">
          {formatTime(recordingTime)}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={reset}
          className="text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg flex-1">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium text-destructive">
            Enregistrement... {formatTime(recordingTime)}
          </span>
          <div className="flex-1" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
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
