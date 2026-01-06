import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Music2, Plus, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Link } from 'react-router-dom';

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  hashtags: string[];
  music_title: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

const Reels = () => {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReels();
    if (user) {
      fetchLikedReels();
    }
  }, [user]);

  const fetchReels = async () => {
    try {
      const { data, error } = await supabase
        .from('reels')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url, username)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReels(data || []);
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedReels = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('reel_likes')
        .select('reel_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setLikedReels(new Set(data?.map(l => l.reel_id) || []));
    } catch (error) {
      console.error('Error fetching liked reels:', error);
    }
  };

  const handleLike = async (reelId: string) => {
    if (!user) {
      toast.error('Connectez-vous pour aimer');
      return;
    }

    const isLiked = likedReels.has(reelId);
    
    try {
      if (isLiked) {
        await supabase
          .from('reel_likes')
          .delete()
          .eq('reel_id', reelId)
          .eq('user_id', user.id);
        
        setLikedReels(prev => {
          const newSet = new Set(prev);
          newSet.delete(reelId);
          return newSet;
        });
      } else {
        await supabase
          .from('reel_likes')
          .insert({ reel_id: reelId, user_id: user.id });
        
        setLikedReels(prev => new Set(prev).add(reelId));
      }

      // Update likes count
      setReels(prev => prev.map(r => 
        r.id === reelId 
          ? { ...r, likes_count: r.likes_count + (isLiked ? -1 : 1) }
          : r
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const navigateReel = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'down' && currentIndex < reels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  useEffect(() => {
    // Play current video, pause others
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      const reel = reels[currentIndex];
      if (reel && id === reel.id) {
        video.play().catch(console.error);
      } else {
        video.pause();
      }
    });
  }, [currentIndex, reels]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div 
        ref={containerRef}
        className="fixed inset-0 top-16 bottom-16 overflow-hidden"
      >
        {reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <p className="text-lg mb-4">Aucun Reel disponible</p>
            <Link to="/reels/create">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Créer le premier Reel
              </Button>
            </Link>
          </div>
        ) : (
          <div 
            className="h-full transition-transform duration-300"
            style={{ transform: `translateY(-${currentIndex * 100}%)` }}
          >
            {reels.map((reel, index) => (
              <div 
                key={reel.id}
                className="h-full w-full relative flex items-center justify-center"
              >
                <video
                  ref={el => { if (el) videoRefs.current[reel.id] = el; }}
                  src={reel.video_url}
                  className="h-full w-full object-cover"
                  loop
                  muted={isMuted}
                  playsInline
                  onClick={() => {
                    const video = videoRefs.current[reel.id];
                    if (video.paused) video.play();
                    else video.pause();
                  }}
                />

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

                {/* Right side actions */}
                <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
                  <Link to={`/profile/${reel.user_id}`}>
                    <Avatar className="w-12 h-12 border-2 border-white">
                      <AvatarImage src={reel.profiles?.avatar_url} />
                      <AvatarFallback>{reel.profiles?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Link>

                  <button 
                    onClick={() => handleLike(reel.id)}
                    className="flex flex-col items-center"
                  >
                    <Heart 
                      className={`w-8 h-8 ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} 
                    />
                    <span className="text-white text-sm">{reel.likes_count}</span>
                  </button>

                  <button className="flex flex-col items-center">
                    <MessageCircle className="w-8 h-8 text-white" />
                    <span className="text-white text-sm">{reel.comments_count}</span>
                  </button>

                  <button className="flex flex-col items-center">
                    <Share2 className="w-8 h-8 text-white" />
                  </button>

                  <button onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? (
                      <VolumeX className="w-8 h-8 text-white" />
                    ) : (
                      <Volume2 className="w-8 h-8 text-white" />
                    )}
                  </button>
                </div>

                {/* Bottom info */}
                <div className="absolute left-4 right-20 bottom-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold">@{reel.profiles?.username}</span>
                  </div>
                  <p className="text-white text-sm mb-2">{reel.caption}</p>
                  {reel.hashtags && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {reel.hashtags.map((tag, i) => (
                        <span key={i} className="text-primary text-sm">#{tag}</span>
                      ))}
                    </div>
                  )}
                  {reel.music_title && (
                    <div className="flex items-center gap-2">
                      <Music2 className="w-4 h-4 text-white" />
                      <span className="text-white text-sm">{reel.music_title}</span>
                    </div>
                  )}
                </div>

                {/* Navigation arrows */}
                {index > 0 && (
                  <button 
                    onClick={() => navigateReel('up')}
                    className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 hover:text-white"
                  >
                    <ChevronUp className="w-8 h-8" />
                  </button>
                )}
                {index < reels.length - 1 && (
                  <button 
                    onClick={() => navigateReel('down')}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 hover:text-white"
                  >
                    <ChevronDown className="w-8 h-8" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create button */}
      <Link 
        to="/reels/create"
        className="fixed bottom-20 right-4 z-50"
      >
        <Button size="lg" className="rounded-full w-14 h-14 shadow-lg">
          <Plus className="w-6 h-6" />
        </Button>
      </Link>

      <MobileNav />
    </div>
  );
};

export default Reels;
