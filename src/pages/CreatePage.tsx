import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
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

const CreatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    description: '',
    category: 'business',
    website: '',
    phone_number: '',
    email: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data: page, error: pageError } = await supabase
        .from('pages' as any)
        .insert({
          name: formData.name,
          username: formData.username,
          description: formData.description,
          category: formData.category,
          website: formData.website || null,
          phone_number: formData.phone_number || null,
          email: formData.email || null,
          location: formData.location || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      // Add creator as owner
      await supabase
        .from('page_admins' as any)
        .insert({
          page_id: (page as any).id,
          user_id: user.id,
          role: 'owner',
        });

      toast.success('Page créée avec succès !');
      navigate(`/pages/${(page as any).id}`);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Ce nom d\'utilisateur est déjà pris');
      } else {
        toast.error('Erreur lors de la création de la page');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate('/pages')}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux pages
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Créer une nouvelle page</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de la page *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Studio Design Abidjan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur * (@username)</Label>
                  <Input
                    id="username"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                    placeholder="studiodesignabidjan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Entreprise</SelectItem>
                      <SelectItem value="artist">Artiste</SelectItem>
                      <SelectItem value="influencer">Influenceur</SelectItem>
                      <SelectItem value="public_figure">Personnalité publique</SelectItem>
                      <SelectItem value="brand">Marque</SelectItem>
                      <SelectItem value="organization">Organisation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez votre page..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://exemple.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@exemple.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Téléphone</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="0759566087"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Abidjan, Côte d'Ivoire"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/pages')}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Création...' : 'Créer la page'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreatePage;
