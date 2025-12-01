import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';

interface Page {
  id: string;
  name: string;
  description: string;
  category: string;
  profile_image: string | null;
  cover_image: string | null;
  website: string | null;
  follower_count: number;
  is_following: boolean;
}

const Pages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, [user]);

  const fetchPages = async () => {
    try {
      const { data: pagesData } = await supabase
        .from('pages' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (pagesData) {
        const enrichedPages = await Promise.all(
          pagesData.map(async (page: any) => {
            const { count: followerCount } = await supabase
              .from('page_followers' as any)
              .select('*', { count: 'exact', head: true })
              .eq('page_id', page.id);

            const { data: followerData } = await supabase
              .from('page_followers' as any)
              .select('id')
              .eq('page_id', page.id)
              .eq('user_id', user?.id)
              .maybeSingle();

            return {
              ...page,
              follower_count: followerCount || 0,
              is_following: !!followerData,
            };
          })
        );

        setPages(enrichedPages);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des pages');
    } finally {
      setLoading(false);
    }
  };

  const followPage = async (pageId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('page_followers' as any)
        .insert({
          page_id: pageId,
          user_id: user.id,
        });

      toast.success('Vous suivez maintenant cette page !');
      fetchPages();
    } catch (error) {
      toast.error('Erreur lors du suivi de la page');
    }
  };

  const unfollowPage = async (pageId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('page_followers' as any)
        .delete()
        .eq('page_id', pageId)
        .eq('user_id', user.id);

      toast.success('Vous ne suivez plus cette page');
      fetchPages();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      artist: 'Artiste',
      influencer: 'Influenceur',
      public_figure: 'Personnalité publique',
      business: 'Entreprise',
      brand: 'Marque',
      organization: 'Organisation',
    };
    return labels[category] || category;
  };

  const filteredPages = pages.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">Pages</h1>
            <Button onClick={() => navigate('/pages/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une page
            </Button>
          </div>

          <Input
            placeholder="Rechercher une page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />

          {loading ? (
            <p className="text-center py-8">Chargement...</p>
          ) : filteredPages.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucune page trouvée</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPages.map((page) => (
                <Card key={page.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  {page.cover_image && (
                    <div className="h-24 overflow-hidden">
                      <img
                        src={page.cover_image}
                        alt={page.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={page.profile_image || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {page.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{page.name}</CardTitle>
                        {page.category && (
                          <Badge variant="secondary" className="mt-1">
                            {getCategoryLabel(page.category)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {page.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {page.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{page.follower_count} abonné{page.follower_count > 1 ? 's' : ''}</span>
                    </div>
                    {page.is_following ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => unfollowPage(page.id)}
                      >
                        Ne plus suivre
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => followPage(page.id)}
                      >
                        Suivre
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Pages;
