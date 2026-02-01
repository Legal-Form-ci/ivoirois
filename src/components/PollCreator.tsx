import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, X, BarChart3, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PollCreatorProps {
  postId?: string;
  onPollCreated?: (pollId: string) => void;
  onCancel?: () => void;
}

const PollCreator = ({ postId, onPollCreated, onCancel }: PollCreatorProps) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState('24'); // hours
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Connectez-vous pour créer un sondage');
      return;
    }

    if (!question.trim()) {
      toast.error('Ajoutez une question');
      return;
    }

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error('Ajoutez au moins 2 options');
      return;
    }

    setLoading(true);

    try {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + parseInt(duration));

      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          post_id: postId || null,
          created_by: user.id,
          question: question.trim(),
          ends_at: endsAt.toISOString(),
          is_multiple_choice: isMultipleChoice,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create options
      const optionsToInsert = validOptions.map((opt, i) => ({
        poll_id: poll.id,
        option_text: opt.trim(),
        position: i,
      }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      toast.success('Sondage créé !');
      onPollCreated?.(poll.id);
    } catch (error) {
      console.error('Poll creation error:', error);
      toast.error('Erreur lors de la création du sondage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Créer un sondage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Question</Label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Posez votre question..."
            maxLength={280}
          />
          <p className="text-xs text-muted-foreground text-right">
            {question.length}/280
          </p>
        </div>

        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter une option
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Durée
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 heure</SelectItem>
                <SelectItem value="6">6 heures</SelectItem>
                <SelectItem value="12">12 heures</SelectItem>
                <SelectItem value="24">1 jour</SelectItem>
                <SelectItem value="72">3 jours</SelectItem>
                <SelectItem value="168">1 semaine</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={isMultipleChoice}
              onCheckedChange={setIsMultipleChoice}
            />
            <Label>Choix multiples</Label>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Création...' : 'Créer le sondage'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PollCreator;
