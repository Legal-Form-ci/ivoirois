import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Plus, Search, Clock, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Course {
  id: string;
  title: string;
  short_description?: string;
  cover_url?: string;
  category?: string;
  level?: string;
  price?: number;
  currency?: string;
  duration_minutes?: number;
  instructor_id: string;
}

const Learning = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setCourses((data as Course[]) || []);
      if (user) {
        const { data: e } = await supabase.from("enrollments").select("course_id").eq("user_id", user.id);
        setEnrolled(new Set((e || []).map((r: any) => r.course_id)));
      }
      setLoading(false);
    })();
  }, [user]);

  const filtered = courses.filter((c) =>
    !q ||
    c.title.toLowerCase().includes(q.toLowerCase()) ||
    (c.category || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-screen-xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">E'nvlé Learning</h1>
                <p className="text-sm text-muted-foreground">Formez-vous, certifiez-vous, partagez votre savoir.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/learning/mine"><Award className="h-4 w-4 mr-2" />Mes cours</Link>
              </Button>
              <Button asChild>
                <Link to="/learning/create"><Plus className="h-4 w-4 mr-2" />Créer un cours</Link>
              </Button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un cours, une catégorie..." className="pl-9" />
          </div>

          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun cours publié pour le moment.</CardContent></Card>
          ) : (
            <div className="auto-grid-wide">
              {filtered.map((c) => (
                <Card key={c.id} className="overflow-hidden hover:shadow-hover transition">
                  <Link to={`/learning/${c.id}`}>
                    <div className="aspect-video bg-muted overflow-hidden">
                      {c.cover_url ? (
                        <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-brand">
                          <GraduationCap className="h-12 w-12 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">
                      <Link to={`/learning/${c.id}`}>{c.title}</Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {c.short_description && <p className="text-sm text-muted-foreground line-clamp-2">{c.short_description}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {c.category && <Badge variant="secondary">{c.category}</Badge>}
                      {c.level && <Badge variant="outline">{c.level}</Badge>}
                      {enrolled.has(c.id) && <Badge>Inscrit</Badge>}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {c.duration_minutes ? `${c.duration_minutes} min` : "—"}
                      </span>
                      <span className="font-semibold">
                        {c.price && c.price > 0 ? `${c.price} ${c.currency || "XOF"}` : "Gratuit"}
                      </span>
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

export default Learning;