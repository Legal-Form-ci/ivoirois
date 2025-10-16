import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Eye, Download } from "lucide-react";
import { toast } from "sonner";

interface Resume {
  id: string;
  title: string;
  summary: string;
  skills: string[];
  is_public: boolean;
  is_primary: boolean;
  created_at: string;
}

const Resume = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes((data as any) || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des CV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Mes CV
              </h1>
              <p className="text-muted-foreground mt-1">
                Créez et gérez vos CV professionnels
              </p>
            </div>
            <Button onClick={() => navigate("/resume/create")} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer un CV
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : resumes.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Aucun CV créé</p>
              <p className="text-muted-foreground mb-4">
                Créez votre premier CV professionnel pour postuler aux offres d'emploi
              </p>
              <Button onClick={() => navigate("/resume/create")}>
                Créer mon premier CV
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {resumes.map((resume) => (
                <Card key={resume.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{resume.title}</CardTitle>
                        {resume.summary && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {resume.summary}
                          </p>
                        )}
                        {resume.skills && resume.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {resume.skills.slice(0, 5).map((skill, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-muted px-2 py-1 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                            {resume.skills.length > 5 && (
                              <span className="text-xs bg-muted px-2 py-1 rounded">
                                +{resume.skills.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {resume.is_primary && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Principal
                          </span>
                        )}
                        {resume.is_public && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/resume/${resume.id}`)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/resume/${resume.id}/edit`)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => toast.info("Fonctionnalité bientôt disponible")}
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
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

export default Resume;
