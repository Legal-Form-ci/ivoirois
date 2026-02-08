import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Loader2, Wand2, Table, AtSign, X, FileText, Users, Building, Briefcase, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIPostGeneratorProps {
  onGenerated: (content: string, hashtags: string[], title: string, hook: string) => void;
}

const POST_STYLES = [
  { value: 'professional', label: 'Professionnel', description: 'Formel et corporate', icon: Briefcase },
  { value: 'storytelling', label: 'Storytelling', description: 'Récit personnel engageant', icon: FileText },
  { value: 'educational', label: 'Éducatif', description: 'Informatif et pédagogique', icon: Globe },
  { value: 'motivational', label: 'Motivationnel', description: 'Inspirant et énergisant', icon: Sparkles },
  { value: 'news', label: 'Actualité', description: 'Annonce ou nouvelle', icon: FileText },
  { value: 'opinion', label: 'Opinion', description: 'Point de vue argumenté', icon: Users },
];

const MENTION_TYPES = [
  { type: 'user', label: 'Personne', icon: Users, prefix: '@' },
  { type: 'company', label: 'Entreprise', icon: Building, prefix: '@' },
  { type: 'group', label: 'Groupe', icon: Users, prefix: '@' },
  { type: 'job', label: 'Offre emploi', icon: Briefcase, prefix: '#job:' },
  { type: 'government', label: 'Institution', icon: Globe, prefix: '@gov:' },
];

const AIPostGenerator = ({ onGenerated }: AIPostGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'topic' | 'structure'>('topic');
  
  // Topic mode
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('professional');
  const [includeTable, setIncludeTable] = useState(false);
  
  // Structure mode  
  const [rawContent, setRawContent] = useState('');
  
  // Shared
  const [mentionInput, setMentionInput] = useState('');
  const [mentionType, setMentionType] = useState('user');
  const [mentions, setMentions] = useState<{ type: string; value: string }[]>([]);
  const [context, setContext] = useState('');

  const addMention = () => {
    if (mentionInput.trim()) {
      const typeInfo = MENTION_TYPES.find(t => t.type === mentionType);
      const newMention = { 
        type: mentionType, 
        value: `${typeInfo?.prefix || '@'}${mentionInput.trim()}` 
      };
      if (!mentions.some(m => m.value === newMention.value)) {
        setMentions([...mentions, newMention]);
      }
      setMentionInput('');
    }
  };

  const removeMention = (value: string) => {
    setMentions(mentions.filter(m => m.value !== value));
  };

  const generatePost = async () => {
    if (mode === 'topic' && !topic.trim()) {
      toast.error('Entrez un sujet pour générer la publication');
      return;
    }
    if (mode === 'structure' && !rawContent.trim()) {
      toast.error('Entrez du texte brut à structurer');
      return;
    }

    setLoading(true);
    try {
      const mentionStrings = mentions.map(m => m.value);
      
      const payload = mode === 'topic' 
        ? { topic, style, includeTable, mentions: mentionStrings, context }
        : { rawContent, mentions: mentionStrings, context, formFields: ['title', 'hook', 'hashtags', 'category'] };

      const { data, error } = await supabase.functions.invoke('ai-generate-post', {
        body: payload
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

      toast.success('✨ Publication générée avec succès!');
      setOpen(false);
      
      // Reset form
      setTopic('');
      setRawContent('');
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
          className="gap-2 bg-gradient-to-r from-primary/10 to-primary/20 border-primary/30 hover:border-primary/50 hover:bg-primary/20"
        >
          <Sparkles className="h-4 w-4" />
          Générer avec IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            Générateur de Publication IA
          </DialogTitle>
          <DialogDescription>
            Créez une publication professionnelle et bien structurée automatiquement
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'topic' | 'structure')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="topic" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Par sujet
            </TabsTrigger>
            <TabsTrigger value="structure" className="gap-2">
              <FileText className="h-4 w-4" />
              Structurer texte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topic" className="space-y-4 mt-4">
            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic">Sujet de la publication *</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Les tendances du marché de l'emploi en Côte d'Ivoire, l'innovation technologique en Afrique..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Style */}
            <div className="space-y-2">
              <Label>Style de rédaction</Label>
              <div className="grid grid-cols-2 gap-2">
                {POST_STYLES.map((s) => (
                  <Button
                    key={s.value}
                    type="button"
                    variant={style === s.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStyle(s.value)}
                    className="justify-start gap-2 h-auto py-2"
                  >
                    <s.icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs opacity-70">{s.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Include Table */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Table className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Inclure un tableau</span>
                  <p className="text-xs text-muted-foreground">Données comparatives ou statistiques</p>
                </div>
              </div>
              <Switch checked={includeTable} onCheckedChange={setIncludeTable} />
            </div>
          </TabsContent>

          <TabsContent value="structure" className="space-y-4 mt-4">
            {/* Raw Content */}
            <div className="space-y-2">
              <Label htmlFor="rawContent">Texte brut à structurer *</Label>
              <Textarea
                id="rawContent"
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="Collez ou écrivez votre texte brut ici. L'IA va automatiquement:
• Créer un titre accrocheur
• Ajouter une phrase d'accroche
• Structurer en paragraphes et sections
• Formater avec gras, italique, listes
• Générer des hashtags pertinents"
                className="min-h-[150px] resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 Écrivez simplement votre contenu sans formatage. L'IA s'occupe du reste!
            </p>
          </TabsContent>
        </Tabs>

        {/* Mentions - Shared between modes */}
        <div className="space-y-3 border-t pt-4 mt-4">
          <Label className="flex items-center gap-2">
            <AtSign className="h-4 w-4" />
            Mentions (personnes, entreprises, groupes, institutions...)
          </Label>
          
          <div className="flex gap-2">
            <Select value={mentionType} onValueChange={setMentionType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MENTION_TYPES.map((type) => (
                  <SelectItem key={type.type} value={type.type}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-3 w-3" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={mentionInput}
              onChange={(e) => setMentionInput(e.target.value)}
              placeholder="Nom à mentionner..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMention())}
            />
            <Button type="button" variant="outline" size="sm" onClick={addMention}>
              Ajouter
            </Button>
          </div>
          
          {mentions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mentions.map((mention) => {
                const typeInfo = MENTION_TYPES.find(t => t.type === mention.type);
                return (
                  <Badge key={mention.value} variant="secondary" className="gap-1 py-1">
                    {typeInfo && <typeInfo.icon className="h-3 w-3" />}
                    {mention.value}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeMention(mention.value)}
                    />
                  </Badge>
                );
              })}
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
            placeholder="Ex: Pour notre page entreprise, ton décontracté, secteur tech..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button 
            onClick={generatePost} 
            disabled={loading || (mode === 'topic' ? !topic.trim() : !rawContent.trim())}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
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
