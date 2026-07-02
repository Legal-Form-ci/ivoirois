import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FolderKanban, Plus, Search, MapPin, Building2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  created_by: string;
  company_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  location: string | null;
  website: string | null;
  cover_image: string | null;
  is_public: boolean;
  companies?: { name: string; logo_url: string | null } | null;
}

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*, companies(name, logo_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects((data as any) || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des projets");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`Supprimer le projet « ${project.title} » ?`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) toast.error("Suppression impossible");
    else {
      toast.success("Projet supprimé");
      fetchProjects();
    }
  };

  const filtered = projects.filter((p) =>
    [p.title, p.description, p.category, p.location, p.companies?.name]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-4 md:py-6">
        <div className="max-w-screen-xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <FolderKanban className="h-7 w-7" />
                Projets
              </h1>
              <p className="text-muted-foreground mt-1">Créez, publiez et gérez vos projets professionnels.</p>
            </div>
            <Button onClick={() => navigate("/projects/create")} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Créer un projet
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un projet..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>

          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Chargement...</p>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center">
              <FolderKanban className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Aucun projet trouvé</p>
              <Button onClick={() => navigate("/projects/create")}>Créer le premier projet</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((project) => (
                <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {project.cover_image && <img src={project.cover_image} alt={project.title} className="h-40 w-full object-cover" />}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                      <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.description && <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>}
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {project.companies?.name && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{project.companies.name}</span>}
                      {project.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{project.location}</span>}
                    </div>
                    {project.category && <Badge variant="secondary">{project.category}</Badge>}
                    {project.created_by === user?.id && (
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                          <Pencil className="h-4 w-4" /> Modifier
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => deleteProject(project)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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

export default Projects;