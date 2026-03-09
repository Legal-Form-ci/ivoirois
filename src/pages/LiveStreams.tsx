import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Radio, Eye, MessageCircle, Heart, Users, Play, Plus, 
  Loader2, Send, Pin, Wifi, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface LiveStream {
  id: string;
  host_id: string;
  title: string;
  description: string;
  status: string;
  viewers_count: number;
  started_at: string;
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
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchStreams();
    const channel = supabase
      .channel('live-streams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => fetchStreams())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*, profiles:host_id(full_name, avatar_url, username)')
        .in('status', ['live', 'scheduled'])
        .order('started_at', { ascending: false });

      if (error) throw error;
      setStreams(data || []);
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
      const { data, error } = await supabase.from('live_streams').insert({
        host_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        status: 'live',
        started_at: new Date().toISOString(),
        stream_key: crypto.randomUUID(),
      }).select().single();

      if (error) throw error;
      toast.success('Live démarré !');
      setShowCreate(false);
      setTitle('');
      setDescription('');
      fetchStreams();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const openStream = async (stream: LiveStream) => {
    setSelectedStream(stream);
    fetchComments(stream.id);

    // Subscribe to comments
    const channel = supabase
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
      .limit(100);
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
    toast.success('Live terminé');
    fetchStreams();
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Radio className="h-6 w-6 text-red-500" />
                Live
              </h1>
              <p className="text-muted-foreground">Diffusions en direct</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Démarrer un Live
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : streams.length === 0 ? (
            <Card className="p-12 text-center">
              <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun live en cours</p>
              <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2">
                <Play className="h-4 w-4" />
                Lancer le premier Live
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {streams.map(stream => (
                <Card
                  key={stream.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                  onClick={() => openStream(stream)}
                >
                  <div className="relative aspect-video bg-gradient-to-br from-red-500/20 to-primary/20 flex items-center justify-center">
                    {stream.thumbnail_url ? (
                      <img src={stream.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Radio className="h-16 w-16 text-red-500/50" />
                    )}
                    <Badge className="absolute top-2 left-2 bg-red-500 text-white gap-1">
                      <Wifi className="h-3 w-3" />
                      EN DIRECT
                    </Badge>
                    <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                      <Eye className="h-3 w-3" />
                      {stream.viewers_count || 0}
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
                          {stream.profiles?.full_name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Démarrer un Live</DialogTitle>
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
            />
            <Button onClick={createStream} disabled={creating || !title.trim()} className="w-full gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Lancer le Live
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stream Viewer */}
      <Dialog open={!!selectedStream} onOpenChange={() => setSelectedStream(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          {selectedStream && (
            <div className="flex flex-col h-[80vh]">
              {/* Video area */}
              <div className="relative aspect-video bg-black flex items-center justify-center shrink-0">
                <div className="text-center text-white">
                  <Radio className="h-16 w-16 mx-auto mb-4 text-red-500 animate-pulse" />
                  <h3 className="text-lg font-semibold">{selectedStream.title}</h3>
                  <p className="text-white/70 text-sm">
                    {selectedStream.profiles?.full_name}
                  </p>
                </div>
                <Badge className="absolute top-3 left-3 bg-red-500 text-white gap-1">
                  <Wifi className="h-3 w-3" /> LIVE
                </Badge>
                {selectedStream.host_id === user?.id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-3 right-3"
                    onClick={() => endStream(selectedStream.id)}
                  >
                    <WifiOff className="h-4 w-4 mr-1" /> Terminer
                  </Button>
                )}
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback>{comment.profiles?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-1.5">
                      <p className="text-xs font-semibold">{comment.profiles?.full_name}</p>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                    {comment.is_pinned && <Pin className="h-4 w-4 text-primary shrink-0 mt-1" />}
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
                <Button size="icon" onClick={sendComment}>
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
