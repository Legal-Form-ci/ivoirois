import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const CreateGroup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'public',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[CreateGroup] handleSubmit called');
    console.log('[CreateGroup] User:', user);
    console.log('[CreateGroup] FormData:', formData);
    
    if (!user) {
      console.error('[CreateGroup] No user found - cannot create group');
      toast.error('Vous devez être connecté pour créer un groupe');
      return;
    }

    setLoading(true);
    try {
      console.log('[CreateGroup] Inserting group...');
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: formData.name,
          description: formData.description,
          privacy: formData.privacy,
          created_by: user.id,
        })
        .select()
        .single();

      console.log('[CreateGroup] Group insert result:', { group, groupError });

      if (groupError) {
        console.error('[CreateGroup] Group creation error:', groupError);
        throw groupError;
      }

      // Add creator as admin
      console.log('[CreateGroup] Adding creator as admin...');
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) {
        console.error('[CreateGroup] Member insert error:', memberError);
      }

      console.log('[CreateGroup] Success! Navigating to group...');
      toast.success('Groupe créé avec succès !');
      navigate(`/groups/${group.id}`);
    } catch (error: any) {
      console.error('[CreateGroup] Error:', error);
      toast.error(`Erreur lors de la création du groupe: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate('/groups')}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux groupes
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Créer un nouveau groupe</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du groupe *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Développeurs Abidjan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez votre groupe..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="privacy">Confidentialité</Label>
                  <Select
                    value={formData.privacy}
                    onValueChange={(value) => setFormData({ ...formData, privacy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public - Tout le monde peut voir et rejoindre</SelectItem>
                      <SelectItem value="private">Privé - Sur invitation uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/groups')}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Création...' : 'Créer le groupe'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default CreateGroup;
