import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Award, GraduationCap, Plus } from "lucide-react";

const MyLearning = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [teaching, setTeaching] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: e } = await supabase.from("enrollments").select("*, courses(*)").eq("user_id", user.id).order("created_at", { ascending: false });
      setEnrollments(e || []);
      const { data: t } = await supabase.from("courses").select("*").eq("instructor_id", user.id).order("created_at", { ascending: false });
      setTeaching(t || []);
      const { data: c } = await supabase.from("certificates").select("*, courses(title)").eq("user_id", user.id).order("issued_at", { ascending: false });
      setCerts(c || []);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-screen-xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" />Mon apprentissage</h1>
            <Button asChild><Link to="/learning/create"><Plus className="h-4 w-4 mr-2" />Créer un cours</Link></Button>
          </div>

          <Tabs defaultValue="learning">
            <TabsList>
              <TabsTrigger value="learning">En cours ({enrollments.length})</TabsTrigger>
              <TabsTrigger value="teaching">J'enseigne ({teaching.length})</TabsTrigger>
              <TabsTrigger value="certs">Certificats ({certs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="learning" className="space-y-3">
              {enrollments.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune inscription. <Link to="/learning" className="text-primary underline">Parcourir les cours</Link></CardContent></Card>
              ) : enrollments.map((e) => (
                <Card key={e.id}>
                  <CardContent className="pt-4 flex items-center gap-4">
                    <div className="w-24 h-16 bg-muted rounded overflow-hidden shrink-0">
                      {e.courses?.cover_url && <img src={e.courses.cover_url} className="w-full h-full object-cover" alt="" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/learning/${e.course_id}`} className="font-semibold hover:underline">{e.courses?.title}</Link>
                      <Progress value={e.progress || 0} className="mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">{e.progress || 0}% terminé</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="teaching" className="space-y-3">
              {teaching.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Vous n'avez pas encore créé de cours.</CardContent></Card>
              ) : teaching.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-4 flex items-center justify-between gap-4">
                    <Link to={`/learning/${c.id}`} className="font-semibold hover:underline">{c.title}</Link>
                    <div className="flex gap-2">
                      <span className="text-xs text-muted-foreground self-center">{c.published ? "Publié" : "Brouillon"}</span>
                      <Button size="sm" variant="outline" asChild><Link to={`/learning/${c.id}/edit`}>Modifier</Link></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="certs" className="space-y-3">
              {certs.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun certificat. Terminez un cours pour en obtenir un.</CardContent></Card>
              ) : certs.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 font-semibold"><Award className="h-4 w-4 text-primary" />{c.courses?.title}</div>
                      <p className="text-xs text-muted-foreground mt-1">N° {c.certificate_number}</p>
                    </div>
                    <Button asChild size="sm"><Link to={`/certificate/${c.certificate_number}`}>Voir</Link></Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default MyLearning;