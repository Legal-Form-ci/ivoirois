import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, Video, Music2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';

const CreateReel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('La vidéo ne doit pas dépasser 500 MB');
      return;
    }

    // Check duration (90 seconds max for reels)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > 90) {
        toast.error('La durée maximale est de 90 secondes');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    };
    video.src = URL.createObjectURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      // Upload video
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('reels')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName);

      // Get video duration
      const video = document.createElement('video');
      video.src = videoPreview;
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      // Parse hashtags
      const hashtagsArray = hashtags
        .split(/[,\s#]+/)
        .filter(tag => tag.trim())
        .map(tag => tag.trim());

      // Create reel record
      const { error } = await supabase
        .from('reels')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          caption,
          hashtags: hashtagsArray,
          music_title: musicTitle || null,
          duration: Math.round(video.duration)
        });

      if (error) throw error;

      toast.success('Reel publié avec succès!');
      navigate('/reels');
    } catch (error) {
      console.error('Error creating reel:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pt-20">
        <Button
          variant="ghost"
          onClick={() => navigate('/reels')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux Reels
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-6 h-6" />
              Créer un Reel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Video Upload */}
              <div className="space-y-2">
                <Label>Vidéo (max 90 secondes, 500 MB)</Label>
                {videoPreview ? (
                  <div className="relative aspect-[9/16] max-h-[400px] bg-black rounded-lg overflow-hidden">
                    <video
                      src={videoPreview}
                      className="w-full h-full object-contain"
                      controls
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeVideo}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="aspect-[9/16] max-h-[400px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-center">
                      Cliquez pour sélectionner une vidéo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format vertical recommandé (9:16)
                    </p>
                  </div>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <Label htmlFor="caption">Légende</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Décrivez votre Reel..."
                  rows={3}
                  maxLength={2200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {caption.length}/2200
                </p>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <Label htmlFor="hashtags">Hashtags</Label>
                <Input
                  id="hashtags"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#tendance #viral #ivoirois"
                />
                <p className="text-xs text-muted-foreground">
                  Séparez les hashtags par des espaces ou des virgules
                </p>
              </div>

              {/* Music */}
              <div className="space-y-2">
                <Label htmlFor="music" className="flex items-center gap-2">
                  <Music2 className="w-4 h-4" />
                  Musique (optionnel)
                </Label>
                <Input
                  id="music"
                  value={musicTitle}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  placeholder="Nom de la musique utilisée"
                />
              </div>

              {/* Progress */}
              {loading && uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Upload: {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/reels')}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !videoFile}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    'Publier'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
};

export default CreateReel;
