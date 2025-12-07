import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Award,
  Star,
  Calendar,
  Edit,
  Share2,
  Printer
} from "lucide-react";
import { toast } from "sonner";

interface Resume {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  skills: string[];
  experience: any[];
  education: any[];
  certifications: any[];
  achievements: string[];
  languages: any[];
  is_public: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  profession?: string;
  bio?: string;
  location?: string;
  phone_number?: string;
  region?: string;
  sector?: string;
  position?: string;
  experience_level?: string;
  education_level?: string;
  years_of_experience?: number;
}

const ResumeView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchResume();
    }
  }, [id]);

  const fetchResume = async () => {
    try {
      const { data: resumeData, error: resumeError } = await (supabase as any)
        .from("resumes")
        .select("*")
        .eq("id", id)
        .single();

      if (resumeError) throw resumeError;
      setResume(resumeData);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", resumeData.user_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      toast.error("Erreur lors du chargement du CV");
      navigate("/resume");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `CV de ${profile?.full_name}`,
          text: resume?.title,
          url,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papiers");
    }
  };

  const handleExportPDF = () => {
    // Trigger print dialog which can save as PDF
    window.print();
    toast.info("Utilisez 'Enregistrer en PDF' dans les options d'impression");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container py-6 text-center">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!resume || !profile) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container py-6 text-center">
          <p>CV non trouvé</p>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === resume.user_id;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Actions Bar - Hidden in print */}
          <div className="flex items-center justify-between print:hidden">
            <Button variant="ghost" onClick={() => navigate("/resume")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              {isOwner && (
                <Button size="sm" onClick={() => navigate(`/resume/${id}/edit`)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Modifier
                </Button>
              )}
            </div>
          </div>

          {/* CV Content */}
          <div ref={printRef} className="bg-card rounded-xl shadow-lg overflow-hidden print:shadow-none">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-primary to-secondary p-6 sm:p-8 text-primary-foreground">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary-foreground/20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-3xl bg-primary-foreground/20">
                    {profile.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold">{profile.full_name}</h1>
                  <p className="text-lg opacity-90 mt-1">{resume.title || profile.profession}</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 text-sm opacity-80">
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </span>
                    )}
                    {profile.phone_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {profile.phone_number}
                      </span>
                    )}
                    {profile.years_of_experience && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {profile.years_of_experience} ans d'expérience
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Summary */}
              {resume.summary && (
                <section>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    À propos
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{resume.summary}</p>
                </section>
              )}

              <Separator />

              {/* Skills */}
              {resume.skills && resume.skills.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Compétences
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Experience */}
              {resume.experience && resume.experience.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Expérience Professionnelle
                    </h2>
                    <div className="space-y-6">
                      {resume.experience.map((exp: any, idx: number) => (
                        <div key={idx} className="relative pl-6 border-l-2 border-primary/20">
                          <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-primary" />
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                            <h3 className="font-semibold text-lg">{exp.title}</h3>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {exp.startDate} - {exp.current ? "Présent" : exp.endDate}
                            </span>
                          </div>
                          <p className="text-primary font-medium">{exp.company}</p>
                          {exp.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {exp.location}
                            </p>
                          )}
                          {exp.description && (
                            <p className="text-muted-foreground mt-2">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Education */}
              {resume.education && resume.education.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Formation
                    </h2>
                    <div className="space-y-6">
                      {resume.education.map((edu: any, idx: number) => (
                        <div key={idx} className="relative pl-6 border-l-2 border-secondary/20">
                          <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-secondary" />
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                            <h3 className="font-semibold text-lg">{edu.degree}</h3>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {edu.year}
                            </span>
                          </div>
                          <p className="text-secondary font-medium">{edu.school}</p>
                          {edu.field && (
                            <p className="text-muted-foreground mt-1">{edu.field}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Certifications */}
              {resume.certifications && resume.certifications.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Certifications
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {resume.certifications.map((cert: any, idx: number) => (
                        <Card key={idx} className="p-4">
                          <h3 className="font-semibold">{cert.name}</h3>
                          <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                          <p className="text-xs text-muted-foreground mt-1">{cert.year}</p>
                        </Card>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Languages */}
              {resume.languages && resume.languages.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h2 className="text-xl font-bold mb-4">Langues</h2>
                    <div className="flex flex-wrap gap-4">
                      {resume.languages.map((lang: any, idx: number) => (
                        <div key={idx} className="text-center">
                          <Badge variant="outline" className="px-4 py-2">
                            {lang.name}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{lang.level}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Achievements */}
              {resume.achievements && resume.achievements.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      Réalisations
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      {resume.achievements.map((achievement, idx) => (
                        <li key={idx}>{achievement}</li>
                      ))}
                    </ul>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [class*="bg-muted"] {
            background: white !important;
          }
          header, nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          .container {
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ResumeView;
