import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Plus, Calendar, MapPin, Clock, Users, Search,
  Globe, Lock, Video
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  location: string;
  location_type: string;
  start_date: string;
  end_date: string;
  privacy: string;
  category: string;
  created_by: string;
  attendees_count: number;
  user_status: string | null;
  creator: {
    full_name: string;
    avatar_url: string;
  };
}

const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (eventsData) {
        const enrichedEvents = await Promise.all(
          eventsData.map(async (event: any) => {
            const { data: creator } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', event.created_by)
              .single();

            const { count } = await supabase
              .from('event_attendees')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .eq('status', 'going');

            let userStatus = null;
            if (user) {
              const { data: attendance } = await supabase
                .from('event_attendees')
                .select('status')
                .eq('event_id', event.id)
                .eq('user_id', user.id)
                .maybeSingle();
              userStatus = attendance?.status || null;
            }

            return {
              ...event,
              creator,
              attendees_count: count || 0,
              user_status: userStatus,
            };
          })
        );

        setEvents(enrichedEvents);
        setMyEvents(enrichedEvents.filter(e => 
          e.created_by === user?.id || e.user_status
        ));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string, status: 'going' | 'interested') => {
    if (!user) {
      toast.error('Connectez-vous pour participer');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_attendees')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status,
        });

      if (error) throw error;
      toast.success(status === 'going' ? 'Vous participez !' : 'Intéressé enregistré');
      fetchEvents();
    } catch (error) {
      console.error('RSVP error:', error);
      toast.error('Erreur lors de l\'inscription');
    }
  };

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  );

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {event.cover_image && (
        <div className="h-40 overflow-hidden">
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{event.title}</h3>
            <p className="text-sm text-primary font-medium">
              {format(new Date(event.start_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
          </div>
          {event.privacy === 'private' ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Globe className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {event.location_type === 'online' ? (
            <>
              <Video className="h-4 w-4" />
              <span>Événement en ligne</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location || 'Lieu à confirmer'}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={event.creator?.avatar_url} />
            <AvatarFallback>{event.creator?.full_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            Par {event.creator?.full_name}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{event.attendees_count} participant{event.attendees_count > 1 ? 's' : ''}</span>
          </div>
          {event.category && (
            <Badge variant="secondary">{event.category}</Badge>
          )}
        </div>

        <div className="flex gap-2">
          {event.user_status === 'going' ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              Vous participez
            </Badge>
          ) : event.user_status === 'interested' ? (
            <Badge variant="outline">Intéressé</Badge>
          ) : (
            <>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleRSVP(event.id, 'going')}
              >
                Participer
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleRSVP(event.id, 'interested')}
              >
                Intéressé
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Événements</h1>
              <p className="text-muted-foreground">Découvrez et participez aux événements</p>
            </div>
            <Button onClick={() => navigate('/events/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer un événement
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un événement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>

          <Tabs defaultValue="discover" className="space-y-4">
            <TabsList>
              <TabsTrigger value="discover" className="gap-2">
                <Calendar className="h-4 w-4" />
                Découvrir
              </TabsTrigger>
              <TabsTrigger value="my-events" className="gap-2">
                <Users className="h-4 w-4" />
                Mes événements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover">
              {loading ? (
                <div className="text-center py-12">Chargement...</div>
              ) : filteredEvents.length === 0 ? (
                <Card className="p-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun événement à venir</p>
                  <Button 
                    className="mt-4"
                    onClick={() => navigate('/events/create')}
                  >
                    Créer le premier événement
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-events">
              {myEvents.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Vous n'avez pas encore d'événements
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default Events;
