import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { 
  Image, Video, Music, FileText, Link as LinkIcon, Hash, 
  Calendar as CalendarIcon, Send, X, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import UltraAdvancedEditor from './UltraAdvancedEditor';

interface UltraCreatePostProps {
  onPostCreated?: () => void;
}

const UltraCreatePost = ({ onPostCreated }: UltraCreatePostProps) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: string; name: string }[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const maxSize = 500 * 1024 * 1024;
    
    const validFiles = selectedFiles.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} dépasse la limite de 500 MB`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const preview = {
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name
      };
      setFilePreviews(prev => [...prev, preview]);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (type.startsWith('video/')) return <Video className="w-6 h-6" />;
    if (type.startsWith('audio/')) return <Music className="w-6 h-6" />;
    return <FileText className="w-6 h-6" />;
  };

  const handleHashtagsGenerated = (generatedHashtags: string[]) => {
    const current = hashtags.split(/[,\s#]+/).filter(h => h.trim());
    const merged = [...new Set([...current, ...generatedHashtags])];
    setHashtags(merged.map(h => `#${h}`).join(' '));
  };

  const handleTitleGenerated = (generatedTitle: string) => {
    if (!title) {
      setTitle(generatedTitle);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!content && files.length === 0)) {
      toast.error('Ajoutez du contenu ou des fichiers');
      return;
    }

    setLoading(true);

    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, file);

        if (uploadError) continue;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
        mediaTypes.push(file.type);
      }

      const linksArray = links.split(/[\s,]+/).filter(l => l.trim());
      const hashtagsArray = hashtags.split(/[,\s#]+/).filter(h => h.trim());

      const postData: any = {
        user_id: user.id,
        title: title || null,
        hook: hook || null,
        content,
        media_urls: mediaUrls,
        media_types: mediaTypes,
        links: linksArray,
        hashtags: hashtagsArray,
        image_url: mediaUrls[0] || null
      };

      if (isScheduled && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':');
        const scheduledAt = new Date(scheduledDate);
        scheduledAt.setHours(parseInt(hours), parseInt(minutes));
        
        postData.is_scheduled = true;
        postData.scheduled_at = scheduledAt.toISOString();
      }

      const { error } = await supabase.from('posts').insert(postData);

      if (error) throw error;

      toast.success(isScheduled ? 'Publication programmée!' : 'Publication créée!');
      
      setTitle('');
      setHook('');
      setContent('');
      setLinks('');
      setHashtags('');
      setFiles([]);
      setFilePreviews([]);
      setIsScheduled(false);
      setScheduledDate(undefined);
      
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <Avatar className="ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {profile?.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">Créer une publication</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title" className="text-sm font-medium">Titre (optionnel)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de votre publication..."
              className="font-semibold text-lg"
            />
          </div>

          {/* Hook */}
          <div className="space-y-1">
            <Label htmlFor="hook" className="text-sm font-medium">Phrase d'accroche (optionnel)</Label>
            <Input
              id="hook"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Une phrase qui capte l'attention..."
              className="italic text-muted-foreground"
            />
          </div>

          {/* Ultra Advanced Editor */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Contenu</Label>
            <UltraAdvancedEditor
              content={content}
              onChange={setContent}
              placeholder="Écrivez votre publication... Utilisez l'IA pour améliorer votre texte!"
              minHeight="200px"
              showAISuggestions={true}
              onHashtagsGenerated={handleHashtagsGenerated}
              onTitleGenerated={handleTitleGenerated}
            />
          </div>

          {/* Links */}
          <div className="space-y-1">
            <Label htmlFor="links" className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Liens (optionnel)
            </Label>
            <Input
              id="links"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://exemple.com (séparés par des espaces)"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-1">
            <Label htmlFor="hashtags" className="text-sm font-medium flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Hashtags (optionnel)
            </Label>
            <Input
              id="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#tendance #ivoirois #emploi"
            />
          </div>

          {/* File Previews */}
          {filePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {filePreviews.map((preview, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden">
                  {preview.type.startsWith('image/') ? (
                    <img src={preview.url} alt="Preview" className="w-full h-24 object-cover" />
                  ) : preview.type.startsWith('video/') ? (
                    <video src={preview.url} className="w-full h-24 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-muted flex flex-col items-center justify-center p-2">
                      {getFileIcon(preview.type)}
                      <span className="text-xs text-muted-foreground truncate w-full text-center mt-1">
                        {preview.name}
                      </span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Schedule Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Programmer la publication</span>
            </div>
            <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
          </div>

          {/* Schedule Date/Time */}
          {isScheduled && (
            <div className="flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    {scheduledDate 
                      ? format(scheduledDate, 'PPP', { locale: fr })
                      : 'Choisir une date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-32"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="w-4 h-4 mr-1" />
                Média
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-4 h-4 mr-1" />
                Fichier
              </Button>
            </div>
            
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-primary/80">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publication...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {isScheduled ? 'Programmer' : 'Publier'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UltraCreatePost;
