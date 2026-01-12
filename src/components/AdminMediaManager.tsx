import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Upload, Image, Video, X, Loader2, Trash2, 
  Plus, Eye, FolderOpen, Save
} from 'lucide-react';
import { toast } from 'sonner';

interface MediaSection {
  id: string;
  section_key: string;
  section_name: string;
  description: string | null;
  media_urls: string[] | null;
  media_types: string[] | null;
  updated_at: string | null;
}

interface PendingFile {
  file: File;
  preview: string;
  type: string;
}

const SECTION_OPTIONS = [
  { key: 'hero', name: 'Section Héro (Accueil)' },
  { key: 'pepiniere', name: 'Section Pépinière' },
  { key: 'about', name: 'Section À Propos' },
  { key: 'features', name: 'Section Fonctionnalités' },
  { key: 'partners', name: 'Section Partenaires' },
  { key: 'testimonials', name: 'Section Témoignages' },
  { key: 'footer', name: 'Section Pied de page' },
  { key: 'auth', name: 'Page Authentification' },
  { key: 'jobs', name: 'Page Emplois' },
  { key: 'companies', name: 'Page Entreprises' }
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const AdminMediaManager = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<MediaSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [currentMedia, setCurrentMedia] = useState<{ urls: string[]; types: string[] }>({ urls: [], types: [] });
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSectionKey, setNewSectionKey] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (selectedSection) {
      const section = sections.find(s => s.section_key === selectedSection);
      if (section) {
        setCurrentMedia({
          urls: section.media_urls || [],
          types: section.media_types || []
        });
        setDescription(section.description || '');
      }
    }
  }, [selectedSection, sections]);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_media')
        .select('*')
        .order('section_name');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Erreur lors du chargement des sections');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles: PendingFile[] = [];
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dépasse 500 MB`);
        continue;
      }
      
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} n'est pas un fichier média valide`);
        continue;
      }

      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
        type: file.type
      });
    }

    setPendingFiles(prev => [...prev, ...validFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeCurrentMedia = (index: number) => {
    setCurrentMedia(prev => ({
      urls: prev.urls.filter((_, i) => i !== index),
      types: prev.types.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!selectedSection || !user) return;

    setUploading(true);
    try {
      const newUrls: string[] = [...currentMedia.urls];
      const newTypes: string[] = [...currentMedia.types];

      // Upload new files
      for (const pending of pendingFiles) {
        const fileExt = pending.file.name.split('.').pop();
        const fileName = `${selectedSection}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, pending.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
        newTypes.push(pending.file.type);
      }

      // Update or create section
      const existingSection = sections.find(s => s.section_key === selectedSection);
      
      if (existingSection) {
        const { error } = await supabase
          .from('admin_media')
          .update({
            media_urls: newUrls,
            media_types: newTypes,
            description,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('section_key', selectedSection);

        if (error) throw error;
      } else {
        const sectionOption = SECTION_OPTIONS.find(s => s.key === selectedSection);
        const { error } = await supabase
          .from('admin_media')
          .insert({
            section_key: selectedSection,
            section_name: sectionOption?.name || selectedSection,
            media_urls: newUrls,
            media_types: newTypes,
            description,
            updated_by: user.id
          });

        if (error) throw error;
      }

      // Clean up previews
      pendingFiles.forEach(p => URL.revokeObjectURL(p.preview));
      setPendingFiles([]);

      toast.success('Médias enregistrés avec succès!');
      fetchSections();
    } catch (error) {
      console.error('Error saving media:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setUploading(false);
    }
  };

  const createNewSection = async () => {
    if (!newSectionKey || !newSectionName || !user) return;

    try {
      const { error } = await supabase
        .from('admin_media')
        .insert({
          section_key: newSectionKey.toLowerCase().replace(/\s+/g, '_'),
          section_name: newSectionName,
          updated_by: user.id
        });

      if (error) throw error;

      toast.success('Section créée!');
      setShowCreateDialog(false);
      setNewSectionKey('');
      setNewSectionName('');
      fetchSections();
    } catch (error) {
      console.error('Error creating section:', error);
      toast.error('Erreur lors de la création');
    }
  };

  const MediaPreview = ({ url, type, onRemove }: { url: string; type: string; onRemove?: () => void }) => (
    <div className="relative group rounded-lg overflow-hidden border">
      {type.startsWith('video/') ? (
        <video src={url} className="w-full h-32 object-cover" />
      ) : (
        <img src={url} alt="Media" className="w-full h-32 object-cover" />
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8"
          onClick={() => setPreviewUrl(url)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {onRemove && (
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="absolute top-2 left-2">
        {type.startsWith('video/') ? (
          <Video className="h-4 w-4 text-white drop-shadow" />
        ) : (
          <Image className="h-4 w-4 text-white drop-shadow" />
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Gestionnaire de Médias
            </CardTitle>
            <CardDescription>
              Gérez les images et vidéos de chaque section du site
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle section</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Clé de la section</Label>
                  <Input
                    value={newSectionKey}
                    onChange={(e) => setNewSectionKey(e.target.value)}
                    placeholder="ex: promo_banner"
                  />
                </div>
                <div>
                  <Label>Nom de la section</Label>
                  <Input
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="ex: Bannière Promotionnelle"
                  />
                </div>
                <Button onClick={createNewSection} className="w-full">
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Section Selector */}
        <div className="space-y-2">
          <Label>Sélectionner une section</Label>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une section..." />
            </SelectTrigger>
            <SelectContent>
              {SECTION_OPTIONS.map(option => (
                <SelectItem key={option.key} value={option.key}>
                  {option.name}
                </SelectItem>
              ))}
              {sections
                .filter(s => !SECTION_OPTIONS.some(o => o.key === s.section_key))
                .map(section => (
                  <SelectItem key={section.section_key} value={section.section_key}>
                    {section.section_name}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>

        {selectedSection && (
          <>
            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de cette section..."
                rows={2}
              />
            </div>

            {/* Current Media */}
            {currentMedia.urls.length > 0 && (
              <div className="space-y-2">
                <Label>Médias actuels</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {currentMedia.urls.map((url, index) => (
                    <MediaPreview
                      key={url}
                      url={url}
                      type={currentMedia.types[index] || 'image/'}
                      onRemove={() => removeCurrentMedia(index)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Files */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Nouveaux médias à ajouter</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {pendingFiles.map((pending, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border border-dashed border-primary">
                      {pending.type.startsWith('video/') ? (
                        <video src={pending.preview} className="w-full h-32 object-cover" />
                      ) : (
                        <img src={pending.preview} alt="Preview" className="w-full h-32 object-cover" />
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removePendingFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Ajouter des médias (max 500MB)
              </Button>
              <Button
                onClick={handleSave}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Full Preview Dialog */}
        {previewUrl && (
          <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Aperçu</DialogTitle>
              </DialogHeader>
              {previewUrl.includes('video') || previewUrl.endsWith('.mp4') || previewUrl.endsWith('.webm') ? (
                <video src={previewUrl} controls className="w-full max-h-[70vh] object-contain" />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full max-h-[70vh] object-contain" />
              )}
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMediaManager;
