import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, Check, Wand2, FileText, Languages, 
  Hash, Type, Loader2, ChevronDown 
} from 'lucide-react';
import { toast } from 'sonner';

interface AIWritingAssistantProps {
  text: string;
  onTextChange: (text: string) => void;
  onSuggestion?: (suggestion: string) => void;
}

const AI_ACTIONS = [
  { id: 'correct', label: 'Corriger', icon: Check, description: 'Corriger l\'orthographe et la grammaire' },
  { id: 'improve', label: 'Améliorer', icon: Wand2, description: 'Rendre le texte plus engageant' },
  { id: 'summarize', label: 'Résumer', icon: FileText, description: 'Créer un résumé concis' },
  { id: 'expand', label: 'Développer', icon: Type, description: 'Ajouter plus de détails' },
  { id: 'formal', label: 'Ton formel', icon: Languages, description: 'Style professionnel' },
  { id: 'casual', label: 'Ton décontracté', icon: Languages, description: 'Style amical' },
  { id: 'suggest_hashtags', label: 'Hashtags', icon: Hash, description: 'Suggérer des hashtags' },
  { id: 'suggest_title', label: 'Titres', icon: Type, description: 'Suggérer des titres' },
];

const AIWritingAssistant = ({ text, onTextChange, onSuggestion }: AIWritingAssistantProps) => {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleAction = async (actionId: string) => {
    if (!text.trim()) {
      toast.error('Écrivez du texte d\'abord');
      return;
    }

    setLoading(true);
    setCurrentAction(actionId);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { text, action: actionId }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const result = data.result;

      if (actionId === 'suggest_hashtags' || actionId === 'suggest_title') {
        onSuggestion?.(result);
        toast.success('Suggestions générées!');
      } else {
        onTextChange(result);
        toast.success('Texte mis à jour!');
      }

      setOpen(false);
    } catch (error: any) {
      console.error('AI error:', error);
      toast.error('Erreur lors du traitement IA');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          IA
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2 py-1">
            Assistant d'écriture IA
          </p>
          {AI_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => handleAction(action.id)}
                disabled={loading}
              >
                {loading && currentAction === action.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <div className="flex flex-col items-start">
                  <span>{action.label}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {action.description}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AIWritingAssistant;
