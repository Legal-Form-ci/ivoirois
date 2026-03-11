import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
import { 
  Radio, Eye, MessageCircle, Users, Play, Plus, 
  Loader2, Send, Pin, Wifi, WifiOff, Clock, History, Video
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

  useEffect(() => {
    fetchAllStreams();
    const channel = supabase
      .channel('live-streams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => fetchAllStreams())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
    if (!user || !title.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('live_streams').insert({
        host_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        status: 'live',
        started_at: new Date().toISOString(),
        stream_key: crypto.randomUUID(),
      }).select().single();

      if (error) throw error;
      toast.success('🔴 Live démarré !');
      setShowCreate(false);
      setTitle('');
      setDescription('');
      fetchAllStreams();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const openStream = async (stream: LiveStream) => {
    setSelectedStream(stream);
    fetchComments(stream.id);

    // Update viewer count
    if (stream.status === 'live') {
      await supabase.from('live_streams').update({
        viewers_count: (stream.viewers_count || 0) + 1,
        peak_viewers: Math.max(stream.peak_viewers || 0, (stream.viewers_count || 0) + 1),
      }).eq('id', stream.id);
    }

    supabase
      .channel(`stream-comments-${stream.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_stream_comments', filter: `stream_id=eq.${stream.id}` }, () => {
        fetchComments(stream.id);
      })
      .subscribe();
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

  const endStream = async (streamId: string) => {
    await supabase.from('live_streams').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    }).eq('id', streamId);
    setSelectedStream(null);
    toast.success('Live terminé. Le replay est disponible.');
    fetchAllStreams();
  };

  const getTimeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  };

  const renderStreamCard = (stream: LiveStream, isReplay = false) => (
    <Card
      key={stream.id}
      className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden group"
      onClick={() => openStream(stream)}
    >
      <div className="relative aspect-video bg-gradient-to-br from-red-500/20 to-primary/20 flex items-center justify-center overflow-hidden">
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {isReplay ? (
              <Play className="h-12 w-12 text-primary/50" />
            ) : (
              <Radio className="h-12 w-12 text-red-500/50 animate-pulse" />
            )}
          </div>
        )}
        {!isReplay && stream.status === 'live' && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white gap-1 animate-pulse">
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
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
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
      <main className="container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Radio className="h-6 w-6 text-red-500" />
                Live & Replays
              </h1>
              <p className="text-muted-foreground">Diffusions en direct et replays</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Démarrer un Live
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="live" className="gap-2">
                <Radio className="h-4 w-4" />
                En direct {liveStreams.length > 0 && `(${liveStreams.length})`}
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="gap-2">
                <Clock className="h-4 w-4" />
                Programmés
              </TabsTrigger>
              <TabsTrigger value="replay" className="gap-2">
                <History className="h-4 w-4" />
                Replays
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : liveStreams.length === 0 ? (
                <Card className="p-12 text-center">
                  <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun live en cours</p>
                  <Button onClick={() => setShowCreate(true)} className="gap-2">
                    <Play className="h-4 w-4" />
                    Lancer le premier Live
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveStreams.map(s => renderStreamCard(s))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="mt-4">
              {scheduledStreams.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun live programmé</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduledStreams.map(s => renderStreamCard(s))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="replay" className="mt-4">
              {endedStreams.length === 0 ? (
                <Card className="p-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun replay disponible</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {endedStreams.map(s => renderStreamCard(s, true))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500" />
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
            <Button onClick={createStream} disabled={creating || !title.trim()} className="w-full gap-2 bg-red-500 hover:bg-red-600">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Lancer le Live
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stream Viewer */}
      <Dialog open={!!selectedStream} onOpenChange={() => {
        if (selectedStream) {
          supabase.removeChannel(supabase.channel(`stream-comments-${selectedStream.id}`));
        }
        setSelectedStream(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          {selectedStream && (
            <div className="flex flex-col h-[80vh]">
              {/* Video area */}
              <div className="relative aspect-video bg-black flex items-center justify-center shrink-0">
                <div className="text-center text-white">
                  {selectedStream.status === 'live' ? (
                    <Radio className="h-16 w-16 mx-auto mb-4 text-red-500 animate-pulse" />
                  ) : (
                    <Play className="h-16 w-16 mx-auto mb-4 text-primary" />
                  )}
                  <h3 className="text-lg font-semibold">{selectedStream.title}</h3>
                  <p className="text-white/70 text-sm mt-1">
                    {selectedStream.profiles?.full_name}
                  </p>
                  {selectedStream.description && (
                    <p className="text-white/50 text-xs mt-2 max-w-sm mx-auto">
                      {selectedStream.description}
                    </p>
                  )}
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                  {selectedStream.status === 'live' ? (
                    <Badge className="bg-red-500 text-white gap-1 animate-pulse">
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
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-3 right-3 gap-1"
                    onClick={() => endStream(selectedStream.id)}
                  >
                    <WifiOff className="h-4 w-4" /> Terminer
                  </Button>
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
                    <div className="bg-muted rounded-lg px-3 py-1.5 max-w-[80%]">
                      <p className="text-xs font-semibold">{comment.profiles?.full_name}</p>
                      <p className="text-sm">{comment.content}</p>
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

      <MobileNav />
    </div>
  );
};

export default LiveStreams;
