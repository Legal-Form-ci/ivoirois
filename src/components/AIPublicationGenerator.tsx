import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Sparkles, Loader2, Image, Film, Images, FileText, 
  ImagePlus, Wand2, Eye, X, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIPublicationGeneratorProps {
  onGenerated: (data: {
    content: string;
    title: string;
    hook: string;
    hashtags: string[];
    category: string;
    images?: string[];
  }) => void;
}

const FORMAT_OPTIONS = [
  {
    id: 'text_image',
    label: 'Publication + Image IA',
    description: 'L\'IA génère une image ultra-réaliste cohérente avec votre message',
    icon: ImagePlus,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'text_multi_images',
    label: 'Publication + Carrousel',
    description: 'Galerie de plusieurs images thématiques cohérentes',
    icon: Images,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'text_only',
    label: 'Publication texte',
    description: 'Texte pur, naturel et engageant sans élément visuel',
    icon: FileText,
    color: 'from-emerald-500 to-teal-500',
  },
];

const AIPublicationGenerator = ({ onGenerated }: AIPublicationGeneratorProps) => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'format' | 'generating' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleOpen = () => {
    setOpen(true);
    setStep('input');
    setRawText('');
    setSelectedFormat(null);
    setGeneratedData(null);
    setGeneratedImages([]);
  };

  const handleSelectFormat = (formatId: string) => {
    setSelectedFormat(formatId);
    generatePublication(formatId);
  };

  const generatePublication = async (formatId: string) => {
    if (!rawText.trim()) {
      toast.error('Écrivez au moins une idée');
      return;
    }

    setStep('generating');
    setLoading(true);

    try {
      // Step 1: Generate text content
      const { data: textData, error: textError } = await supabase.functions.invoke('ai-generate-post', {
        body: {
          rawContent: rawText.trim(),
          formFields: ['title', 'hook', 'hashtags', 'category'],
          context: `Format: ${formatId}. Rédige comme un humain sur un réseau social. Ton naturel, pas robotique. Paragraphes courts et aérés.`,
        }
      });

      if (textError) throw textError;
      if (textData.error) throw new Error(textData.error);

      const result = {
        content: textData.content || '',
        title: textData.suggestedTitle || '',
        hook: textData.suggestedHook || '',
        hashtags: textData.hashtags || [],
        category: textData.category || 'general',
        images: [] as string[],
      };

      // Step 2: Generate images if needed
      if (formatId === 'text_image' || formatId === 'text_multi_images') {
        const imageCount = formatId === 'text_multi_images' ? 3 : 1;
        const images: string[] = [];

        for (let i = 0; i < imageCount; i++) {
          try {
            const imagePrompt = i === 0 
              ? `Professional social media image for: ${rawText.trim()}. Ultra realistic, high resolution, clean, no text overlay, no watermark.`
              : `Professional image ${i + 1} related to: ${rawText.trim()}. Different angle/perspective. Ultra realistic, high resolution, clean.`;

            const { data: imgData, error: imgError } = await supabase.functions.invoke('ai-image-generate', {
              body: { prompt: imagePrompt, action: 'generate' }
            });

            if (!imgError && imgData?.images?.[0]) {
              images.push(imgData.images[0]);
            }
          } catch (imgErr) {
            console.error(`Image ${i + 1} generation failed:`, imgErr);
          }
        }

        result.images = images;
        setGeneratedImages(images);
      }

      setGeneratedData(result);
      setStep('preview');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Erreur lors de la génération');
      setStep('format');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (generatedData) {
      onGenerated(generatedData);
      toast.success('Publication générée avec succès !');
      setOpen(false);
    }
  };

  const handleRegenerate = () => {
    if (selectedFormat) {
      generatePublication(selectedFormat);
    }
  };

  // Strip HTML for preview display
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-2 bg-gradient-to-r from-primary/10 to-primary/20 border-primary/30 hover:border-primary/50 hover:bg-primary/20"
      >
        <Sparkles className="h-4 w-4" />
        Générer avec IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
          {/* STEP 1: Input */}
          {step === 'input' && (
            <div className="p-6 space-y-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                    <Wand2 className="h-5 w-5 text-primary" />
                  </div>
                  Publication assistée par IA
                </DialogTitle>
                <DialogDescription>
                  Écrivez une idée, un mot ou une phrase. L'IA s'occupe du reste.
                </DialogDescription>
              </DialogHeader>

              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Ex: Je viens de signer un partenariat stratégique...&#10;Ex: Bonne nouvelle aujourd'hui&#10;Ex: Fier de mon équipe&#10;Ex: Nouveau projet lancé"
                className="min-h-[140px] resize-none text-base"
                autoFocus
              />

              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  💡 Même un seul mot suffit. L'IA comprend le contexte.
                </p>
                <Button
                  onClick={() => setStep('format')}
                  disabled={!rawText.trim()}
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Sparkles className="h-4 w-4" />
                  Générer
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Format Selection */}
          {step === 'format' && (
            <div className="p-6 space-y-5">
              <DialogHeader>
                <DialogTitle>Choisissez le format</DialogTitle>
                <DialogDescription>
                  Sélectionnez comment votre publication sera présentée
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3">
                {FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => handleSelectFormat(format.id)}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
                  >
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${format.color} text-white shrink-0`}>
                      <format.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {format.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <Button variant="ghost" onClick={() => setStep('input')} className="w-full">
                ← Modifier le texte
              </Button>
            </div>
          )}

          {/* STEP 3: Generating */}
          {step === 'generating' && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Génération en cours...</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  L'IA analyse votre texte, structure le contenu{selectedFormat !== 'text_only' ? ' et génère les visuels' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {['Analyse', 'Rédaction', 'Formatage', ...(selectedFormat !== 'text_only' ? ['Images'] : [])].map((s, i) => (
                  <Badge key={s} variant="secondary" className="text-xs animate-pulse" style={{ animationDelay: `${i * 300}ms` }}>
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Preview */}
          {step === 'preview' && generatedData && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="p-4 border-b flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Aperçu de la publication</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                {/* Simulated feed card */}
                <div className="border rounded-xl overflow-hidden bg-card shadow-sm max-w-lg mx-auto">
                  {/* Author header */}
                  <div className="flex items-center gap-3 p-4">
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{profile?.full_name || 'Vous'}</p>
                      <p className="text-xs text-muted-foreground">À l'instant</p>
                    </div>
                  </div>

                  {/* Title */}
                  {generatedData.title && (
                    <div className="px-4 pb-1">
                      <h2 className="font-bold text-base">{generatedData.title}</h2>
                    </div>
                  )}

                  {/* Hook */}
                  {generatedData.hook && (
                    <div className="px-4 pb-2">
                      <p className="text-sm italic text-muted-foreground">{generatedData.hook}</p>
                    </div>
                  )}

                  {/* Content */}
                  <div 
                    className="px-4 pb-3 prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: generatedData.content }}
                  />

                  {/* Images */}
                  {generatedImages.length > 0 && (
                    <div className={`${generatedImages.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}`}>
                      {generatedImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Image générée ${idx + 1}`}
                          className="w-full object-cover max-h-72"
                        />
                      ))}
                    </div>
                  )}

                  {/* Hashtags */}
                  {generatedData.hashtags?.length > 0 && (
                    <div className="px-4 py-2 flex flex-wrap gap-1">
                      {generatedData.hashtags.map((h: string, i: number) => (
                        <span key={i} className="text-xs text-primary font-medium">#{h}</span>
                      ))}
                    </div>
                  )}

                  {/* Fake interaction bar */}
                  <div className="px-4 py-3 border-t flex items-center justify-around text-muted-foreground text-xs">
                    <span>👍 J'aime</span>
                    <span>💬 Commenter</span>
                    <span>🔄 Partager</span>
                  </div>
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="p-4 border-t flex gap-3 shrink-0">
                <Button variant="outline" onClick={handleRegenerate} disabled={loading} className="flex-1 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Régénérer
                </Button>
                <Button onClick={handleConfirm} className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80">
                  <Check className="h-4 w-4" />
                  Utiliser cette publication
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIPublicationGenerator;
