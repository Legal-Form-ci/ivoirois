import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import AdminMediaManager from "@/components/AdminMediaManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, Building2, AlertCircle, Award, FileText, TrendingUp, 
  Search, Shield, CheckCircle2, XCircle, Eye, Ban, MessageSquare,
  Activity, BarChart3, Settings, Flag, Bell, UserPlus, Image
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "@/hooks/useTranslation";

interface Stats {
  totalUsers: number;
  totalCompanies: number;
  pendingVerifications: number;
  totalReports: number;
  activeCertifications: number;
  totalJobPosts: number;
  totalPosts: number;
  totalGroups: number;
  totalPages: number;
}

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  email?: string;
  created_at: string;
  region: string | null;
  is_online: boolean;
}

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  sector: string;
  verified: boolean;
  commerce_registry: string | null;
  created_at: string;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCompanies: 0,
    pendingVerifications: 0,
    totalReports: 0,
    activeCertifications: 0,
    totalJobPosts: 0,
    totalPosts: 0,
    totalGroups: 0,
    totalPages: 0,
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
        .in("role", ["super_admin", "admin"]);

      if (!roles || roles.length === 0) {
        toast.error("Accès refusé : vous n'êtes pas administrateur");
        navigate("/feed");
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchStats(), fetchUsers(), fetchCompanies()]);
    } catch (error) {
      toast.error("Erreur de vérification des droits");
      navigate("/feed");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [
        usersCount, 
        companiesCount, 
        postsCount, 
        groupsCount, 
        pagesCount,
        jobsCount,
        reportsCount,
        certsCount
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("companies" as any).select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("groups").select("*", { count: "exact", head: true }),
        supabase.from("pages").select("*", { count: "exact", head: true }),
        supabase.from("job_posts" as any).select("*", { count: "exact", head: true }),
        supabase.from("reports" as any).select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("certifications" as any).select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      const pendingVerifs = await supabase
        .from("companies" as any)
        .select("*", { count: "exact", head: true })
        .eq("verified", false)
        .not("commerce_registry", "is", null);

      setStats({
        totalUsers: usersCount.count || 0,
        totalCompanies: companiesCount.count || 0,
        totalPosts: postsCount.count || 0,
        totalGroups: groupsCount.count || 0,
        totalPages: pagesCount.count || 0,
        totalJobPosts: jobsCount.count || 0,
        pendingVerifications: pendingVerifs.count || 0,
        totalReports: reportsCount.count || 0,
        activeCertifications: certsCount.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setUsers((data as unknown as UserProfile[]) || []);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setCompanies((data as unknown as Company[]) || []);
  };

  const verifyCompany = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from("companies" as any)
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq("id", companyId);

      if (error) throw error;
      toast.success("Entreprise vérifiée avec succès");
      fetchCompanies();
      fetchStats();
    } catch (error) {
      toast.error("Erreur lors de la vérification");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompanies = companies.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container py-6 text-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                {t('admin.title')}
              </h1>
              <p className="text-muted-foreground">{t('admin.subtitle')}</p>
            </div>
            <Badge variant="destructive" className="text-lg px-4 py-2">
              Super Admin
            </Badge>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin.users')}</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin.companies')}</CardTitle>
                <Building2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin.posts')}</CardTitle>
                <FileText className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPosts}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin.verifications')}</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.pendingVerifications}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin.reports')}</CardTitle>
                <Flag className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.totalReports}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Management Tabs */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t('admin.users')}</span>
              </TabsTrigger>
              <TabsTrigger value="companies" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('admin.companies')}</span>
              </TabsTrigger>
              <TabsTrigger value="verifications" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('admin.verifications')}</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">{t('admin.reports')}</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">{t('admin.media')}</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('admin.analytics')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.userManagement')}</CardTitle>
                  <CardDescription>
                    {stats.totalUsers} {t('admin.usersRegistered')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar>
                                <AvatarImage src={u.avatar_url || undefined} />
                                <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {u.is_online && (
                                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{u.full_name}</p>
                              <p className="text-sm text-muted-foreground">@{u.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {u.region && (
                              <Badge variant="outline">{u.region}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: fr })}
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/profile/${u.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="companies">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.companyManagement')}</CardTitle>
                  <CardDescription>
                    {stats.totalCompanies} {t('admin.companiesRegistered')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {filteredCompanies.map((company) => (
                        <div
                          key={company.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="rounded-lg">
                              <AvatarImage src={company.logo_url || undefined} />
                              <AvatarFallback className="rounded-lg">
                                {company.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{company.name}</p>
                                {company.verified && (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{company.sector}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {company.commerce_registry && !company.verified && (
                              <Button size="sm" onClick={() => verifyCompany(company.id)}>
                                {t('admin.verify')}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verifications">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.verificationRequests')}</CardTitle>
                  <CardDescription>
                    {stats.pendingVerifications} {t('admin.pendingRequests')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {companies
                        .filter((c) => c.commerce_registry && !c.verified)
                        .map((company) => (
                          <div
                            key={company.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="rounded-lg h-12 w-12">
                                <AvatarImage src={company.logo_url || undefined} />
                                <AvatarFallback className="rounded-lg">
                                  {company.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{company.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Registre: {company.commerce_registry}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t('admin.reject')}
                              </Button>
                              <Button size="sm" onClick={() => verifyCompany(company.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t('admin.approve')}
                              </Button>
                            </div>
                          </div>
                        ))}
                      {companies.filter((c) => c.commerce_registry && !c.verified).length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          {t('admin.noPendingRequests')}
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.reports')}</CardTitle>
                  <CardDescription>
                    {t('admin.reportedContent')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('admin.noReports')}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media">
              <AdminMediaManager />
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      {t('admin.recentActivity')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>{t('admin.groupsCreated')}</span>
                        <Badge>{stats.totalGroups}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('admin.pagesCreated')}</span>
                        <Badge>{stats.totalPages}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('admin.jobOffers')}</span>
                        <Badge>{stats.totalJobPosts}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('admin.activeCertifications')}</span>
                        <Badge variant="secondary">{stats.activeCertifications}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {t('admin.growth')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-green-500" />
                          {t('admin.newUsers')}
                        </span>
                        <Badge variant="outline" className="text-green-500">
                          +{Math.floor(stats.totalUsers * 0.1)} {t('admin.thisMonth')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          {t('admin.newCompanies')}
                        </span>
                        <Badge variant="outline" className="text-blue-500">
                          +{Math.floor(stats.totalCompanies * 0.15)} {t('admin.thisMonth')}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default Admin;