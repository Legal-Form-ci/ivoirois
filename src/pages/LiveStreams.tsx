import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getStorageUrl } from '@/lib/storage';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { liveStreamSchema } from '@/lib/validation';
import { 
  Radio, Eye, MessageCircle, Users, Play, Plus, 
  Loader2, Send, Pin, Wifi, WifiOff, Clock, History, Video,
  AlertCircle, RefreshCw, Trash2, Edit3, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveStream {
  id: string;
  host_id: string;
  title: string;
  description: string;
  status: string;
  viewers_count: number;
  peak_viewers: number;
  started_at: string;
  ended_at: string;
  thumbnail_url: string;
  recording_url: string | null;
  privacy?: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

interface StreamComment {
  id: string;
  content: string;
  user_id: string;
  is_pinned: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

const LiveStreams = () => {
  const { user } = useAuth();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [endedStreams, setEndedStreams] = useState<LiveStream[]>([]);
  const [scheduledStreams, setScheduledStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('live');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const currentStreamIdRef = useRef<string | null>(null);
  const [replayUrl, setReplayUrl] = useState<string | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [replayRetryCount, setReplayRetryCount] = useState(0);
  const [uploadingReplay, setUploadingReplay] = useState(false);
  const [openingStreamId, setOpeningStreamId] = useState<string | null>(null);
  const [editingStream, setEditingStream] = useState<LiveStream | null>(null);
  const [deletingStreamId, setDeletingStreamId] = useState<string | null>(null);
  const [endingStreamId, setEndingStreamId] = useState<string | null>(null);

  const withRetry = async <T,>(operation: () => Promise<T>, attempts = 3, delay = 650): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await new Promise((resolve) => window.setTimeout(resolve, delay * attempt));
      }
    }
    throw lastError;
  };

  const getLiveMedia = async () => {
    const constraints: MediaStreamConstraints[] = [
      { video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true } },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: true },
      { video: true, audio: true },
    ];
    let lastError: any;
    for (const constraint of constraints) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraint);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const ensureProfileReady = async () => {
    if (!user) throw new Error('Utilisateur non connecté');

    const { error: rpcError } = await supabase.rpc('ensure_my_profile');
    if (!rpcError) return;

    const fallbackUsername = (user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`)
      .replace(/[^a-zA-Z0-9_'.-]/g, '_')
      .slice(0, 32);

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      username: fallbackUsername,
      full_name: user.user_metadata?.full_name || fallbackUsername || 'Utilisateur',
      avatar_url: user.user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'id' });

    if (upsertError) throw upsertError;
  };

  useEffect(() => {
    fetchAllStreams();
    const channel = supabase
      .channel('live-streams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => fetchAllStreams())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (isStreaming && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => undefined);
    }
  }, [isStreaming]);

  const fetchAllStreams = async () => {
    try {
      // Live streams
      const { data: live } = await supabase
        .from('live_streams')
        .select('*, profiles:host_id(full_name, avatar_url, username)')
        .eq('status', 'live')
        .order('started_at', { ascending: false });
      setLiveStreams(live || []);

      // Scheduled
      const { data: scheduled } = await supabase
        .from('live_streams')
        .select('*, profiles:host_id(full_name, avatar_url, username)')
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true });
      setScheduledStreams(scheduled || []);

      // Ended (Replays)
      const { data: ended } = await supabase
        .from('live_streams')
        .select('*, profiles:host_id(full_name, avatar_url, username)')
        .eq('status', 'ended')
        .order('ended_at', { ascending: false })
        .limit(20);
      setEndedStreams(ended || []);
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStream = async () => {
    if (!user) return;
    const validation = liveStreamSchema.safeParse({ title, description });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Informations du live invalides');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Caméra non supportée par ce navigateur. Utilisez Chrome, Edge ou Safari à jour en HTTPS.');
      return;
    }
    setCreating(true);
    setCameraError(null);
    try {
      // Request camera access first (must be in user gesture chain)
      const stream = await withRetry(getLiveMedia, 2, 500);
      localStreamRef.current = stream;

      await ensureProfileReady();

      const { data: created, error } = await withRetry(async () => supabase.from('live_streams').insert({
          host_id: user.id,
          title: validation.data.title,
          description: validation.data.description?.trim() || null,
          status: 'live',
          privacy: 'public',
          started_at: new Date().toISOString(),
          stream_key: crypto.randomUUID(),
        }).select().single()
      );

      if (error) throw error;
      currentStreamIdRef.current = created?.id ?? null;

      // Start MediaRecorder for replay
      try {
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';
        const rec = new MediaRecorder(stream, { mimeType: mime });
        recordedChunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        rec.start(1000);
        mediaRecorderRef.current = rec;
      } catch (recErr) {
        console.warn('[Live] MediaRecorder unavailable', recErr);
      }

      toast.success('🔴 Live démarré !');
      setShowCreate(false);
      setIsStreaming(true);
      setTitle('');
      setDescription('');
      fetchAllStreams();
      // Attach stream after dialog closes
      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }, 300);
    } catch (error: any) {
      const msg = error.name === 'NotAllowedError'
        ? 'Accès caméra refusé. Vérifiez les permissions.'
        : error.name === 'NotFoundError'
        ? 'Aucune caméra détectée.'
        : error.message?.includes('live_streams_host_id_fkey')
        ? 'Profil utilisateur introuvable. Rechargez la page puis réessayez.'
        : (error.message || 'Erreur');
      setCameraError(msg);
      toast.error(msg);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    } finally {
      setCreating(false);
    }
  };

  const stopStreaming = () => {
    try { mediaRecorderRef.current?.stop(); } catch {}
    mediaRecorderRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setIsStreaming(false);
  };

  const loadReplayUrl = async (stream: LiveStream, forceRetry = false) => {
    if (!stream.recording_url) {
      setReplayUrl(null);
      setReplayError('Aucun fichier replay disponible pour ce live.');
      return;
    }
    setReplayError(null);
    if (forceRetry) setReplayRetryCount((count) => count + 1);
    try {
      const signedReplayUrl = await withRetry(async () => {
        const url = await getStorageUrl('recordings', stream.recording_url);
        if (!url) throw new Error('Replay indisponible ou non autorisé');
        return url;
      }, 3, 900);
      setReplayUrl(signedReplayUrl);
    } catch (e: any) {
      setReplayError(e?.message || 'Replay indisponible ou non autorisé');
      toast.error('Replay indisponible, nouvelle tentative possible');
    }
  };

  const openStream = async (stream: LiveStream) => {
    setOpeningStreamId(stream.id);
    setSelectedStream(stream);
    setReplayUrl(null);
    setReplayError(null);
    fetchComments(stream.id);

    // Update viewer count
    if (stream.status === 'live') {
      await supabase.rpc('increment_live_viewer', { _stream_id: stream.id });
    }

    // Replay: create a signed URL for the recording
    if (stream.status === 'ended') {
      await loadReplayUrl(stream);
    }

    supabase
      .channel(`stream-comments-${stream.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_stream_comments', filter: `stream_id=eq.${stream.id}` }, () => {
        fetchComments(stream.id);
      })
      .subscribe();
    setOpeningStreamId(null);
  };

  const fetchComments = async (streamId: string) => {
    const { data } = await supabase
      .from('live_stream_comments')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: true })
      .limit(200);
    setComments(data || []);
  };

  const sendComment = async () => {
    if (!newComment.trim() || !selectedStream || !user) return;
    const { error } = await supabase.from('live_stream_comments').insert({
      stream_id: selectedStream.id,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (!error) setNewComment('');
  };

  const updateStream = async () => {
    if (!editingStream || !user) return;
    const validation = liveStreamSchema.safeParse({ title, description });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Informations invalides');
      return;
    }
    const { error } = await supabase.from('live_streams').update({
      title: validation.data.title,
      description: validation.data.description?.trim() || null,
    }).eq('id', editingStream.id);
    if (error) {
      toast.error('Modification impossible');
      return;
    }
    toast.success('Live mis à jour');
    setEditingStream(null);
    setTitle('');
    setDescription('');
    fetchAllStreams();
    if (selectedStream?.id === editingStream.id) {
      setSelectedStream({ ...selectedStream, title: validation.data.title, description: validation.data.description?.trim() || '' });
    }
  };

  const deleteStream = async (stream: LiveStream) => {
    if (!user) return;
    setDeletingStreamId(stream.id);
    try {
      if (stream.recording_url) {
        await supabase.storage.from('recordings').remove([stream.recording_url]);
      }
      const { error } = await supabase.from('live_streams').delete().eq('id', stream.id);
      if (error) throw error;
      toast.success(stream.status === 'ended' ? 'Replay supprimé' : 'Live supprimé');
      if (selectedStream?.id === stream.id) setSelectedStream(null);
      fetchAllStreams();
    } catch (error: any) {
      toast.error(error?.message || 'Suppression impossible');
    } finally {
      setDeletingStreamId(null);
    }
  };

  const endStream = async (streamId: string) => {
    setEndingStreamId(streamId);
    // Stop recorder & wait for final chunk before stopping tracks
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      setUploadingReplay(true);
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        try { recorder.stop(); } catch { resolve(); }
      });
      mediaRecorderRef.current = null;

      // Upload to storage
      try {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];
        if (blob.size > 0 && user) {
          const path = `${streamId}/replay-${Date.now()}.webm`;
          const { error: upErr } = await withRetry(() => supabase.storage
            .from('recordings')
            .upload(path, blob, { upsert: true, contentType: 'video/webm' }), 3, 1200);
          if (upErr) {
            console.error('[Replay] Upload failed', upErr);
            toast.error('Replay non sauvegardé');
          } else {
            await withRetry(async () => await supabase.from('live_streams').update({
              status: 'ended',
              ended_at: new Date().toISOString(),
              recording_url: path,
            }).eq('id', streamId), 3, 900);
            setUploadingReplay(false);
            setEndingStreamId(null);
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            setIsStreaming(false);
            currentStreamIdRef.current = null;
            setSelectedStream(null);
            toast.success('Live terminé. Replay disponible.');
            fetchAllStreams();
            return;
          }
        }
      } catch (e) {
        console.error('[Replay] Error', e);
      }
      setUploadingReplay(false);
    }

    stopStreaming();
    await withRetry(async () => await supabase.from('live_streams').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    }).eq('id', streamId), 3, 900);
    setSelectedStream(null);
    currentStreamIdRef.current = null;
    setEndingStreamId(null);
    toast.success('Live terminé.');
    fetchAllStreams();
  };

  const getTimeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  };

  const beginEditStream = (stream: LiveStream) => {
    setEditingStream(stream);
    setTitle(stream.title || '');
    setDescription(stream.description || '');
  };

  const renderStreamCard = (stream: LiveStream, isReplay = false) => (
    <Card
      key={stream.id}
      className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden group"
      onClick={() => openStream(stream)}
    >
    <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {isReplay ? (
              <Play className="h-12 w-12 text-primary/50" />
            ) : (
              <Radio className="h-12 w-12 text-destructive/50 animate-pulse" />
            )}
          </div>
        )}
        {!isReplay && stream.status === 'live' && (
          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground gap-1 animate-pulse">
            <Wifi className="h-3 w-3" />
            EN DIRECT
          </Badge>
        )}
        {isReplay && (
          <Badge variant="secondary" className="absolute top-2 left-2 gap-1">
            <History className="h-3 w-3" />
            REPLAY
          </Badge>
        )}
        {stream.status === 'scheduled' && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground gap-1">
            <Clock className="h-3 w-3" />
            PROGRAMMÉ
          </Badge>
        )}
        <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
          <Eye className="h-3 w-3" />
          {stream.status === 'ended' ? (stream.peak_viewers || 0) : (stream.viewers_count || 0)}
        </Badge>
        {stream.host_id === user?.id && (
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={(event) => {
                event.stopPropagation();
                beginEditStream(stream);
              }}
              title="Modifier"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              disabled={deletingStreamId === stream.id}
              onClick={(event) => {
                event.stopPropagation();
                deleteStream(stream);
              }}
              title="Supprimer"
            >
              {deletingStreamId === stream.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={stream.profiles?.avatar_url} />
            <AvatarFallback>{stream.profiles?.full_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{stream.title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {stream.profiles?.full_name} · {isReplay ? getTimeAgo(stream.ended_at || stream.started_at) : getTimeAgo(stream.started_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="w-full px-2 sm:px-3 lg:px-4 py-3 md:py-5">
        <div className="w-full space-y-5 md:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
              <Radio className="h-6 w-6 text-destructive" />
                Live & Replays
              </h1>
              <p className="text-muted-foreground">Diffusions en direct et replays</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Démarrer un Live
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <p className="min-w-0 break-words">Lives et replays utilisent des permissions RLS et des URLs signées ; les actions créer/modifier/supprimer restent limitées à l’hôte.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="live" className="gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
                <Radio className="h-4 w-4" />
                <span className="truncate">En direct {liveStreams.length > 0 && `(${liveStreams.length})`}</span>
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
                <Clock className="h-4 w-4" />
                <span className="truncate">Programmés</span>
              </TabsTrigger>
              <TabsTrigger value="replay" className="gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
                <History className="h-4 w-4" />
                <span className="truncate">Replays</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : liveStreams.length === 0 ? (
                  <Card className="p-6 sm:p-12 text-center">
                  <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun live en cours</p>
                  <Button onClick={() => setShowCreate(true)} className="gap-2">
                    <Play className="h-4 w-4" />
                    Lancer le premier Live
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {liveStreams.map(s => renderStreamCard(s))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="mt-4">
              {scheduledStreams.length === 0 ? (
                  <Card className="p-6 sm:p-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun live programmé</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {scheduledStreams.map(s => renderStreamCard(s))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="replay" className="mt-4">
              {endedStreams.length === 0 ? (
                  <Card className="p-6 sm:p-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun replay disponible</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {endedStreams.map(s => renderStreamCard(s, true))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        setShowCreate(open);
        if (!open) {
          setCameraError(null);
          setTitle('');
          setDescription('');
        }
      }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-destructive" />
              Démarrer un Live
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Titre du live"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optionnel)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="resize-none"
            />
            {cameraError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{cameraError}</p>
            )}
            <Button onClick={createStream} disabled={creating || !title.trim()} className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Lancer le Live
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingStream} onOpenChange={(open) => {
        if (!open) {
          setEditingStream(null);
          setTitle('');
          setDescription('');
        }
      }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Modifier le live/replay
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Titre du live"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optionnel)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="resize-none"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => {
                setEditingStream(null);
                setTitle('');
                setDescription('');
              }}>
                Annuler
              </Button>
              <Button onClick={updateStream} disabled={!title.trim()} className="gap-2">
                <Edit3 className="h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stream Viewer */}
      <Dialog open={!!selectedStream || isStreaming} onOpenChange={(open) => {
        if (!open && isStreaming && !selectedStream) {
          // Closing own streaming view
          const ownStreamId = currentStreamIdRef.current || liveStreams.find(s => s.host_id === user?.id && s.status === 'live')?.id;
          if (ownStreamId) endStream(ownStreamId);
          else stopStreaming();
          return;
        }
        if (selectedStream) {
          supabase.removeChannel(supabase.channel(`stream-comments-${selectedStream.id}`));
        }
        setSelectedStream(null);
      }}>
        <DialogContent className="max-w-5xl max-h-[94vh] w-[calc(100vw-0.5rem)] p-0 sm:w-full">
          {/* Own camera streaming view */}
          {isStreaming && (!selectedStream || selectedStream.host_id === user?.id) && (
            <div className="flex flex-col h-[82dvh]">
              <div className="relative flex-1 bg-foreground/95 rounded-t-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground gap-1 animate-pulse">
                  <Wifi className="h-3 w-3" /> EN DIRECT
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 gap-2 whitespace-nowrap"
                  disabled={endingStreamId === (currentStreamIdRef.current || liveStreams.find(s => s.host_id === user?.id && s.status === 'live')?.id)}
                  onClick={() => {
                    const ownStreamId = currentStreamIdRef.current || liveStreams.find(s => s.host_id === user?.id && s.status === 'live')?.id;
                    if (ownStreamId) endStream(ownStreamId);
                    else stopStreaming();
                  }}
                >
                  {endingStreamId ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />} Terminer le Live
                </Button>
              </div>
            </div>
          )}
          {selectedStream && (!isStreaming || selectedStream.host_id !== user?.id) && (
            <div className="flex flex-col h-[82dvh]">
              {/* Video area */}
              <div className="relative aspect-video bg-foreground/95 flex items-center justify-center shrink-0 rounded-t-lg overflow-hidden">
                {selectedStream.status === 'ended' && replayUrl ? (
                  <video
                    src={replayUrl}
                    controls
                    autoPlay
                    onError={() => {
                      setReplayError('Erreur de lecture vidéo. Réessayez avec une nouvelle URL signée.');
                      setReplayUrl(null);
                    }}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="text-center text-background px-4">
                    {selectedStream.status === 'live' ? (
                      <Radio className="h-16 w-16 mx-auto mb-4 text-destructive animate-pulse" />
                    ) : (
                      <Play className="h-16 w-16 mx-auto mb-4 text-primary" />
                    )}
                    <h3 className="text-lg font-semibold text-background break-words">{selectedStream.title}</h3>
                    <p className="text-background/70 text-sm mt-1">
                      {selectedStream.profiles?.full_name}
                    </p>
                    {selectedStream.description && (
                      <p className="text-background/50 text-xs mt-2 max-w-sm mx-auto break-words">
                        {selectedStream.description}
                      </p>
                    )}
                    {selectedStream.status === 'ended' && selectedStream.recording_url && !replayUrl && !replayError && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-background/70 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" /> Chargement du replay…
                      </div>
                    )}
                    {selectedStream.status === 'ended' && replayError && (
                      <div className="mt-3 flex flex-col items-center gap-2 text-background/80 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="break-words">{replayError}</span>
                        </div>
                        <Button size="sm" variant="secondary" className="gap-2" onClick={() => loadReplayUrl(selectedStream, true)}>
                          <RefreshCw className="h-3.5 w-3.5" /> Réessayer {replayRetryCount > 0 ? `(${replayRetryCount})` : ''}
                        </Button>
                      </div>
                    )}
                    {selectedStream.status === 'ended' && !selectedStream.recording_url && (
                      <p className="text-background/60 text-xs mt-3">Aucun replay disponible</p>
                    )}
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  {selectedStream.status === 'live' ? (
                    <Badge className="bg-destructive text-destructive-foreground gap-1 animate-pulse">
                      <Wifi className="h-3 w-3" /> LIVE
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <History className="h-3 w-3" /> REPLAY
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <Eye className="h-3 w-3" /> {selectedStream.viewers_count || 0}
                  </Badge>
                </div>
                {selectedStream.host_id === user?.id && selectedStream.status === 'live' && (
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1 whitespace-nowrap"
                      onClick={() => beginEditStream(selectedStream)}
                    >
                      <Edit3 className="h-4 w-4" /> Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1 whitespace-nowrap"
                      disabled={endingStreamId === selectedStream.id}
                      onClick={() => endStream(selectedStream.id)}
                    >
                      {endingStreamId === selectedStream.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />} Terminer
                    </Button>
                  </div>
                )}
                {selectedStream.host_id === user?.id && selectedStream.status === 'ended' && (
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1 whitespace-nowrap"
                      onClick={() => beginEditStream(selectedStream)}
                    >
                      <Edit3 className="h-4 w-4" /> Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1 whitespace-nowrap"
                      disabled={deletingStreamId === selectedStream.id}
                      onClick={() => deleteStream(selectedStream)}
                    >
                      {deletingStreamId === selectedStream.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Supprimer
                    </Button>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    {selectedStream.status === 'live' ? 'Soyez le premier à commenter !' : 'Aucun commentaire'}
                  </p>
                )}
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback className="text-[10px]">{comment.profiles?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-1.5 max-w-[80%] overflow-hidden">
                      <p className="text-xs font-semibold truncate">{comment.profiles?.full_name}</p>
                      <p className="text-sm break-words">{comment.content}</p>
                    </div>
                    {comment.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0 mt-1" />}
                  </div>
                ))}
              </div>

              {/* Comment input */}
              <div className="p-3 border-t flex gap-2 shrink-0">
                <Input
                  placeholder="Commenter..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendComment()}
                  className="flex-1"
                />
                <Button size="icon" onClick={sendComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {openingStreamId && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-card px-4 py-2 text-sm shadow-lg border">
          Ouverture du flux…
        </div>
      )}

      <MobileNav />
    </div>
  );
};

export default LiveStreams;
