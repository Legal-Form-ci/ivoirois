import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Plus, Search, MapPin, Heart, MessageCircle, 
  ShoppingBag, Filter, Truck, Tag
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: string;
  location: string;
  images: string[];
  is_negotiable: boolean;
  delivery_available: boolean;
  views_count: number;
  created_at: string;
  seller: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  is_favorite: boolean;
}

const CATEGORIES = [
  'Électronique', 'Véhicules', 'Immobilier', 'Mode', 'Maison', 
  'Sports', 'Services', 'Emploi', 'Animaux', 'Autres'
];

const CONDITIONS = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  good: 'Bon état',
  fair: 'État acceptable'
};

const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [user, category]);

  const fetchListings = async () => {
    try {
      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data: listingsData } = await query;

      if (listingsData) {
        const enrichedListings = await Promise.all(
          listingsData.map(async (listing: any) => {
            const { data: seller } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', listing.seller_id)
              .single();

            let isFavorite = false;
            if (user) {
              const { data: fav } = await supabase
                .from('marketplace_favorites')
                .select('id')
                .eq('listing_id', listing.id)
                .eq('user_id', user.id)
                .maybeSingle();
              isFavorite = !!fav;
            }

            return {
              ...listing,
              seller,
              is_favorite: isFavorite,
            };
          })
        );
        setListings(enrichedListings);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Erreur lors du chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (listingId: string, isFavorite: boolean) => {
    if (!user) {
      toast.error('Connectez-vous pour sauvegarder');
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('marketplace_favorites')
          .delete()
          .eq('listing_id', listingId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('marketplace_favorites')
          .insert({ listing_id: listingId, user_id: user.id });
      }
      fetchListings();
    } catch (error) {
      console.error('Favorite error:', error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'XOF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredListings = listings.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <ShoppingBag className="h-8 w-8 text-primary" />
                Marketplace
              </h1>
              <p className="text-muted-foreground">Achetez et vendez localement</p>
            </div>
            <Button onClick={() => navigate('/marketplace/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Publier une annonce
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categories quick access */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat)}
                className="whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : filteredListings.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune annonce trouvée</p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/marketplace/create')}
              >
                Publier une annonce
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredListings.map((listing) => (
                <Card 
                  key={listing.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/marketplace/${listing.id}`)}
                >
                  <div className="relative aspect-square overflow-hidden">
                    {listing.images?.[0] ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(listing.id, listing.is_favorite);
                      }}
                    >
                      <Heart 
                        className={`h-4 w-4 ${listing.is_favorite ? 'fill-red-500 text-red-500' : ''}`} 
                      />
                    </Button>
                    {listing.is_negotiable && (
                      <Badge className="absolute bottom-2 left-2 bg-green-500/90">
                        Négociable
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <p className="font-bold text-lg text-primary">
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                    <h3 className="font-medium line-clamp-2 text-sm">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{listing.location || 'Non spécifié'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {CONDITIONS[listing.condition as keyof typeof CONDITIONS] || listing.condition}
                      </Badge>
                      {listing.delivery_available && (
                        <Truck className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default Marketplace;
