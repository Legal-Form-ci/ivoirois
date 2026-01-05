import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, Globe, Phone, Mail, Calendar, Users, Briefcase, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  cover_image: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
  sector: string;
  size: string;
  founded_year: number;
  verified: boolean;
  commerce_registry: string;
}

interface JobPost {
  id: string;
  title: string;
  job_type: string;
  location: string;
  created_at: string;
}

const CompanyView = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchCompany();
      fetchJobs();
    }
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (error) {
      toast.error("Entreprise non trouvée");
      navigate("/companies");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    const { data } = await (supabase as any)
      .from("job_posts")
      .select("id, title, job_type, location, created_at")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) setJobs(data);
  };

  const getSizeLabel = (size: string) => {
    const sizes: Record<string, string> = {
      "1-10": "1-10 employés",
      "11-50": "11-50 employés",
      "51-200": "51-200 employés",
      "201-500": "201-500 employés",
      "501-1000": "501-1000 employés",
      "1001+": "Plus de 1000 employés",
    };
    return sizes[size] || size;
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

  if (!company) return null;

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-4 md:py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate("/companies")}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux entreprises
          </Button>

          {/* Cover & Header */}
          <Card className="overflow-hidden">
            {company.cover_image && (
              <div className="h-48 bg-muted">
                <img
                  src={company.cover_image}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="h-24 w-24 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 border-4 border-background -mt-16 md:-mt-12">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="h-full w-full object-cover rounded-xl"
                    />
                  ) : (
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl md:text-3xl font-bold">{company.name}</h1>
                        {company.verified && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Vérifiée
                          </Badge>
                        )}
                      </div>
                      {company.sector && (
                        <p className="text-muted-foreground mt-1">{company.sector}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    {company.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {company.city}, {company.region}
                      </span>
                    )}
                    {company.size && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {getSizeLabel(company.size)}
                      </span>
                    )}
                    {company.founded_year && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Fondée en {company.founded_year}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {company.website && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" />
                      Site web
                    </a>
                  </Button>
                )}
                {company.phone && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={`tel:${company.phone}`}>
                      <Phone className="h-4 w-4" />
                      Appeler
                    </a>
                  </Button>
                )}
                {company.email && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={`mailto:${company.email}`}>
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          {company.description && (
            <Card>
              <CardHeader>
                <CardTitle>À propos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{company.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Jobs */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Offres d'emploi
                </CardTitle>
                <Button variant="link" onClick={() => navigate(`/jobs?company=${companyId}`)}>
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <h3 className="font-medium">{job.title}</h3>
                    <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{job.job_type}</Badge>
                      {job.location && <span>{job.location}</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Contact */}
          {company.address && (
            <Card>
              <CardHeader>
                <CardTitle>Adresse</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{company.address}</p>
                <p>{company.city}, {company.region}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default CompanyView;
