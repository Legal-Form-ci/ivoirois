import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Users, Lock, Globe } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  privacy: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
}

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    try {
      const { data: groupsData } = await supabase
        .from('groups' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsData) {
        const enrichedGroups = await Promise.all(
          groupsData.map(async (group: any) => {
            const { count: memberCount } = await supabase
              .from('group_members' as any)
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id);

            const { data: memberData } = await supabase
              .from('group_members' as any)
              .select('id')
              .eq('group_id', group.id)
              .eq('user_id', user?.id)
              .maybeSingle();

            return {
              ...group,
              member_count: memberCount || 0,
              is_member: !!memberData,
            };
          })
        );

        setGroups(enrichedGroups);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des groupes');
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('group_members' as any)
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      toast.success('Vous avez rejoint le groupe !');
      fetchGroups();
    } catch (error) {
      toast.error('Erreur lors de l\'adhésion au groupe');
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Groupes</h1>
            <Button onClick={() => navigate('/groups/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer un groupe
            </Button>
          </div>

          <Input
            placeholder="Rechercher un groupe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />

          {loading ? (
            <p className="text-center py-8">Chargement...</p>
          ) : filteredGroups.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucun groupe trouvé</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {group.cover_image_url && (
                    <div className="h-32 overflow-hidden">
                      <img
                        src={group.cover_image_url}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      {group.privacy === 'private' ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {group.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{group.member_count} membre{group.member_count > 1 ? 's' : ''}</span>
                    </div>
                    {group.is_member ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/groups/${group.id}`)}
                      >
                        Voir le groupe
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => joinGroup(group.id)}
                      >
                        Rejoindre
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

export default Groups;
