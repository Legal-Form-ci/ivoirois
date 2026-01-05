import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
}

const JOB_TYPES = [
  { value: "full-time", label: "Temps plein" },
  { value: "part-time", label: "Temps partiel" },
  { value: "contract", label: "Contrat" },
  { value: "internship", label: "Stage" },
  { value: "freelance", label: "Freelance" },
];

const EXPERIENCE_LEVELS = [
  { value: "junior", label: "Junior (0-2 ans)" },
  { value: "mid", label: "Intermédiaire (2-5 ans)" },
  { value: "senior", label: "Senior (5+ ans)" },
  { value: "lead", label: "Lead / Manager" },
];

const REMOTE_OPTIONS = [
  { value: "no", label: "Sur site" },
  { value: "hybrid", label: "Hybride" },
  { value: "full", label: "100% Remote" },
];

const CreateJob = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    company_id: "",
    title: "",
    description: "",
    requirements: "",
    responsibilities: "",
    job_type: "full-time",
    experience_level: "",
    location: "",
    remote_option: "no",
    salary_range: "",
    benefits: "",
    application_email: "",
    application_url: "",
    deadline: "",
  });

  useEffect(() => {
    if (user) {
      fetchMyCompanies();
    }
  }, [user]);

  const fetchMyCompanies = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .eq("created_by", user.id);

    if (data) {
      setCompanies(data);
      if (data.length === 1) {
        setFormData(prev => ({ ...prev, company_id: data[0].id }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.company_id) {
      toast.error("Veuillez sélectionner une entreprise");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("job_posts").insert({
        ...formData,
        created_by: user.id,
        deadline: formData.deadline || null,
      });

      if (error) throw error;

      toast.success("Offre d'emploi créée avec succès !");
      navigate("/jobs");
    } catch (error: any) {
      toast.error("Erreur lors de la création: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
        <Header />
        <main className="container py-6">
          <Card className="max-w-xl mx-auto p-8 text-center">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Créez d'abord une entreprise</h2>
            <p className="text-muted-foreground mb-4">
              Pour publier une offre d'emploi, vous devez d'abord créer une page entreprise.
            </p>
            <Button onClick={() => navigate("/companies/create")}>
              Créer une entreprise
            </Button>
          </Card>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-4 md:py-6">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate("/jobs")}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux offres
          </Button>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Nouvelle offre d'emploi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Entreprise *</Label>
                  <Select
                    value={formData.company_id}
                    onValueChange={(v) => setFormData({ ...formData, company_id: v })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Titre du poste *</Label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Développeur Full Stack Senior"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type de contrat</Label>
                    <Select
                      value={formData.job_type}
                      onValueChange={(v) => setFormData({ ...formData, job_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Niveau d'expérience</Label>
                    <Select
                      value={formData.experience_level}
                      onValueChange={(v) => setFormData({ ...formData, experience_level: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Localisation</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Abidjan, Côte d'Ivoire"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Télétravail</Label>
                    <Select
                      value={formData.remote_option}
                      onValueChange={(v) => setFormData({ ...formData, remote_option: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMOTE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description du poste *</Label>
                  <Textarea
                    required
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez le poste, les missions principales..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsabilités</Label>
                  <Textarea
                    rows={4}
                    value={formData.responsibilities}
                    onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                    placeholder="- Développer et maintenir les applications web&#10;- Collaborer avec l'équipe produit..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prérequis</Label>
                  <Textarea
                    rows={4}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="- 3+ ans d'expérience en développement&#10;- Maîtrise de React et Node.js..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fourchette salariale</Label>
                    <Input
                      value={formData.salary_range}
                      onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                      placeholder="500,000 - 800,000 FCFA/mois"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date limite</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Avantages</Label>
                  <Textarea
                    rows={3}
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    placeholder="- Assurance santé&#10;- Formation continue&#10;- Télétravail flexible..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email de candidature</Label>
                    <Input
                      type="email"
                      value={formData.application_email}
                      onChange={(e) => setFormData({ ...formData, application_email: e.target.value })}
                      placeholder="rh@entreprise.ci"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lien de candidature</Label>
                    <Input
                      type="url"
                      value={formData.application_url}
                      onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/jobs")}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Publication..." : "Publier l'offre"}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default CreateJob;
