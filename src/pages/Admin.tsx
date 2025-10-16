import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, AlertCircle, Award, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  totalUsers: number;
  totalCompanies: number;
  pendingVerifications: number;
  totalReports: number;
  activeCertifications: number;
  totalJobPosts: number;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCompanies: 0,
    pendingVerifications: 0,
    totalReports: 0,
    activeCertifications: 0,
    totalJobPosts: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .single();

      if (!roles) {
        toast.error("Accès refusé : vous n'êtes pas administrateur");
        navigate("/feed");
        return;
      }

      setIsAdmin(true);
      await fetchStats();
    } catch (error) {
      toast.error("Erreur de vérification des droits");
      navigate("/feed");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersCount, companiesCount, verificationsCount, reportsCount, certificationsCount, jobsCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        (supabase as any).from("companies").select("*", { count: "exact", head: true }),
        (supabase as any).from("company_verifications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("certifications").select("*", { count: "exact", head: true }).eq("status", "active"),
        (supabase as any).from("job_posts").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalCompanies: companiesCount.count || 0,
        pendingVerifications: verificationsCount.count || 0,
        totalReports: reportsCount.count || 0,
        activeCertifications: certificationsCount.count || 0,
        totalJobPosts: jobsCount.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Tableau de bord Administrateur</h1>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Super Admin
            </Badge>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Membres inscrits</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entreprises</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCompanies}</div>
                <p className="text-xs text-muted-foreground">Entreprises enregistrées</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vérifications</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.pendingVerifications}</div>
                <p className="text-xs text-muted-foreground">En attente</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Signalements</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.totalReports}</div>
                <p className="text-xs text-muted-foreground">À traiter</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certifications</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeCertifications}</div>
                <p className="text-xs text-muted-foreground">Actives</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offres d'emploi</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalJobPosts}</div>
                <p className="text-xs text-muted-foreground">Actives</p>
              </CardContent>
            </Card>
          </div>

          {/* Management Tabs */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="companies">Entreprises</TabsTrigger>
              <TabsTrigger value="verifications">Vérifications</TabsTrigger>
              <TabsTrigger value="reports">Signalements</TabsTrigger>
              <TabsTrigger value="certifications">Certifications</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des utilisateurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Gérez les comptes utilisateurs, accordez des certifications et modérez le contenu.
                  </p>
                  <Button onClick={() => navigate("/admin/users")}>
                    Voir tous les utilisateurs
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="companies">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des entreprises</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Validez les entreprises, gérez les vérifications et surveillez les offres d'emploi.
                  </p>
                  <Button onClick={() => navigate("/admin/companies")}>
                    Voir toutes les entreprises
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verifications">
              <Card>
                <CardHeader>
                  <CardTitle>Demandes de vérification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {stats.pendingVerifications} demandes en attente de validation.
                  </p>
                  <Button onClick={() => navigate("/admin/verifications")}>
                    Traiter les demandes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Signalements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {stats.totalReports} signalements à examiner.
                  </p>
                  <Button onClick={() => navigate("/admin/reports")}>
                    Traiter les signalements
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="certifications">
              <Card>
                <CardHeader>
                  <CardTitle>Certifications Ivoi'Rois</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Accordez des badges vérifiés, premium et professionnels.
                  </p>
                  <Button onClick={() => navigate("/admin/certifications")}>
                    Gérer les certifications
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
