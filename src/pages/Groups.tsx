import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
  created_at: string;
  group_members: { count: number }[];
}

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    const { data: memberData } = await supabase
      .from("group_members" as any)
      .select("group_id")
      .eq("user_id", user!.id);

    if (memberData && memberData.length > 0) {
      const groupIds = (memberData as any[]).map((m: any) => m.group_id);
      const { data } = await supabase
        .from("groups" as any)
        .select("*, group_members(count)")
        .in("id", groupIds);

      setGroups((data || []) as unknown as Group[]);
    }
  };

  const createGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error("Le nom du groupe est requis");
      return;
    }

    try {
      const { data: group, error: groupError } = await supabase
        .from("groups" as any)
        .insert({
          name: newGroup.name,
          description: newGroup.description,
          created_by: user!.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      await supabase.from("group_members" as any).insert({
        group_id: (group as any).id,
        user_id: user!.id,
        role: "admin",
      });

      toast.success("Groupe créé !");
      setShowCreateDialog(false);
      setNewGroup({ name: "", description: "" });
      fetchGroups();
    } catch (error) {
      toast.error("Erreur lors de la création du groupe");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Groupes</h1>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer un groupe
            </Button>
          </div>

          {groups.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Vous n'avez rejoint aucun groupe pour le moment
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Créer votre premier groupe
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={group.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {group.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle>{group.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {group.group_members[0]?.count || 0} membres
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  {group.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau groupe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Nom du groupe</label>
              <Input
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Ex: Famille, Amis, Travail..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newGroup.description}
                onChange={(e) =>
                  setNewGroup({ ...newGroup, description: e.target.value })
                }
                placeholder="Décrivez votre groupe..."
                rows={3}
              />
            </div>
            <Button onClick={createGroup} className="w-full">
              Créer le groupe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
