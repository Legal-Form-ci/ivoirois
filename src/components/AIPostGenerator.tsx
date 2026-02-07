import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Wand2, Table, AtSign, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIPostGeneratorProps {
  onGenerated: (content: string, hashtags: string[], title: string, hook: string) => void;
}

const POST_STYLES = [
  { value: 'professional', label: 'Professionnel', description: 'Formel et corporate' },
  { value: 'storytelling', label: 'Storytelling', description: 'Récit personnel engageant' },
  { value: 'educational', label: 'Éducatif', description: 'Informatif et pédagogique' },
  { value: 'motivational', label: 'Motivationnel', description: 'Inspirant et énergisant' },
  { value: 'news', label: 'Actualité', description: 'Annonce ou nouvelle' },
  { value: 'opinion', label: 'Opinion', description: 'Point de vue argumenté' },
];

const AIPostGenerator = ({ onGenerated }: AIPostGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('professional');
  const [includeTable, setIncludeTable] = useState(false);
  const [mentionInput, setMentionInput] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [context, setContext] = useState('');

  const addMention = () => {
    if (mentionInput.trim() && !mentions.includes(mentionInput.trim())) {
      setMentions([...mentions, mentionInput.trim()]);
      setMentionInput('');
    }
  };

  const removeMention = (mention: string) => {
    setMentions(mentions.filter(m => m !== mention));
  };

  const generatePost = async () => {
    if (!topic.trim()) {
      toast.error('Entrez un sujet pour générer la publication');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-post', {
        body: { 
          topic, 
          style, 
          includeTable, 
          mentions, 
          context 
        }
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      onGenerated(
        data.content,
        data.hashtags || [],
        data.suggestedTitle || '',
        data.suggestedHook || ''
      );

      toast.success('Publication générée avec succès!');
      setOpen(false);
      
      // Reset form
      setTopic('');
      setStyle('professional');
      setIncludeTable(false);
      setMentions([]);
      setContext('');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-gradient-to-r from-primary/10 to-primary/20 border-primary/30 hover:border-primary/50"
        >
          <Sparkles className="h-4 w-4" />
          Générer avec IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Générateur de Publication IA
          </DialogTitle>
          <DialogDescription>
            Créez une publication professionnelle et bien structurée en quelques clics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Sujet de la publication *</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Les tendances du marché de l'emploi en Côte d'Ivoire en 2026"
              className="min-h-[80px]"
            />
          </div>

          {/* Style */}
          <div className="space-y-2">
            <Label>Style de rédaction</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex flex-col">
                      <span>{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include Table */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Table className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Inclure un tableau</span>
            </div>
            <Switch checked={includeTable} onCheckedChange={setIncludeTable} />
          </div>

          {/* Mentions */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Mentions (personnes, entreprises, groupes)
            </Label>
            <div className="flex gap-2">
              <Input
                value={mentionInput}
                onChange={(e) => setMentionInput(e.target.value)}
                placeholder="@NomUtilisateur ou Entreprise..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMention())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addMention}>
                Ajouter
              </Button>
            </div>
            {mentions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mentions.map((mention) => (
                  <Badge key={mention} variant="secondary" className="gap-1">
                    @{mention}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeMention(mention)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Contexte additionnel (optionnel)</Label>
            <Input
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Pour notre page entreprise, ton décontracté..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button 
            onClick={generatePost} 
            disabled={loading || !topic.trim()}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIPostGenerator;
