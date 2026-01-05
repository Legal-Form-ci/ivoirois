import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Briefcase, MapPin, Building2, Clock, DollarSign, Globe, Mail, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface JobPost {
  id: string;
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
  job_type: string;
  experience_level: string;
  location: string;
  remote_option: string;
  salary_range: string;
  benefits: string;
  application_email: string;
  application_url: string;
  deadline: string;
  created_at: string;
  created_by: string;
  companies: {
    id: string;
    name: string;
    logo_url: string;
    verified: boolean;
    description: string;
  };
}

const JobView = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJob();
      checkApplication();
    }
  }, [jobId, user]);

  const fetchJob = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("job_posts")
        .select(`
          *,
          companies (
            id,
            name,
            logo_url,
            verified,
            description
          )
        `)
        .eq("id", jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      toast.error("Offre non trouvée");
      navigate("/jobs");
    } finally {
      setLoading(false);
    }
  };

  const checkApplication = async () => {
    if (!user || !jobId) return;

    const { data } = await (supabase as any)
      .from("job_applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .single();

    setHasApplied(!!data);
  };

  const handleApply = async () => {
    if (!user || !jobId) return;

    setApplying(true);
    try {
      const { error } = await supabase.from("job_applications").insert({
        job_id: jobId,
        user_id: user.id,
        cover_letter: coverLetter || null,
      });

      if (error) throw error;

      toast.success("Candidature envoyée avec succès !");
      setHasApplied(true);
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erreur lors de la candidature");
    } finally {
      setApplying(false);
    }
  };

  const getJobTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      "full-time": "Temps plein",
      "part-time": "Temps partiel",
      "contract": "Contrat",
      "internship": "Stage",
      "freelance": "Freelance",
    };
    return types[type] || type;
  };

  const getRemoteLabel = (option: string) => {
    const options: Record<string, string> = {
      "no": "Sur site",
      "hybrid": "Hybride",
      "full": "100% Remote",
    };
    return options[option] || option;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container py-6">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </main>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-4 md:py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate("/jobs")}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux offres
          </Button>

          {/* Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {job.companies.logo_url ? (
                    <img
                      src={job.companies.logo_url}
                      alt={job.companies.name}
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold">{job.title}</h1>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-medium">{job.companies.name}</span>
                        {job.companies.verified && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Vérifiée
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{getJobTypeLabel(job.job_type)}</Badge>
                      {job.remote_option !== "no" && (
                        <Badge variant="outline">{getRemoteLabel(job.remote_option)}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    )}
                    {job.experience_level && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.experience_level}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Publié {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>

                  {job.salary_range && (
                    <div className="mt-4 flex items-center gap-2 text-lg font-semibold text-primary">
                      <DollarSign className="h-5 w-5" />
                      {job.salary_range}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {hasApplied ? (
                  <Button disabled className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Candidature envoyée
                  </Button>
                ) : (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Postuler maintenant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Postuler à {job.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Lettre de motivation (optionnel)</label>
                          <Textarea
                            rows={6}
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Présentez-vous et expliquez pourquoi vous êtes le candidat idéal..."
                            className="mt-2"
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                            Annuler
                          </Button>
                          <Button onClick={handleApply} disabled={applying} className="flex-1">
                            {applying ? "Envoi..." : "Envoyer ma candidature"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {job.application_email && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={`mailto:${job.application_email}`}>
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  </Button>
                )}

                {job.application_url && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={job.application_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Site externe
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description du poste</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{job.description}</p>
            </CardContent>
          </Card>

          {/* Responsibilities */}
          {job.responsibilities && (
            <Card>
              <CardHeader>
                <CardTitle>Responsabilités</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{job.responsibilities}</p>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {job.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Prérequis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{job.requirements}</p>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {job.benefits && (
            <Card>
              <CardHeader>
                <CardTitle>Avantages</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{job.benefits}</p>
              </CardContent>
            </Card>
          )}

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>À propos de {job.companies.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {job.companies.description || "Aucune description disponible."}
              </p>
              <Button
                variant="link"
                className="p-0 mt-2"
                onClick={() => navigate(`/companies/${job.companies.id}`)}
              >
                Voir la page entreprise →
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default JobView;
