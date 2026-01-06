import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Users, Building, FileText, AlertTriangle, BarChart3,
  Shield, Settings, Search, Check, X, Eye, Ban, Trash2,
  Mail, Activity, TrendingUp, Clock, Edit, UserCog
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  verifiedCompanies: number;
  totalPosts: number;
  totalJobs: number;
  pendingReports: number;
  totalGroups: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_online: boolean;
  region: string | null;
}

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  sector: string | null;
  verified: boolean;
  created_at: string;
}

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

const EnhancedAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('dashboard');

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasAccess = roles?.some(r => 
        ['super_admin', 'admin', 'moderator'].includes(r.role)
      );

      if (!hasAccess) {
        toast.error('Accès non autorisé');
        navigate('/feed');
        return;
      }

      setIsAdmin(true);
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchCompanies(),
        fetchReports(),
        fetchTeamMembers()
      ]);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalCompanies },
        { count: verifiedCompanies },
        { count: totalPosts },
        { count: totalJobs },
        { count: pendingReports },
        { count: totalGroups }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('verified', true),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('job_posts').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('groups').select('*', { count: 'exact', head: true })
      ]);

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true);

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalCompanies: totalCompanies || 0,
        verifiedCompanies: verifiedCompanies || 0,
        totalPosts: totalPosts || 0,
        totalJobs: totalJobs || 0,
        pendingReports: pendingReports || 0,
        totalGroups: totalGroups || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setUsers(data || []);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    setCompanies(data || []);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    setReports(data || []);
  };

  const fetchTeamMembers = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .in('role', ['super_admin', 'admin', 'moderator']);

    if (roles) {
      const membersWithProfiles = await Promise.all(
        roles.map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, username')
            .eq('id', role.user_id)
            .single();
          
          return {
            ...role,
            profiles: profile || undefined
          };
        })
      );
      setTeamMembers(membersWithProfiles as TeamMember[]);
    }
  };

  const verifyCompany = async (companyId: string, verified: boolean) => {
    const { error } = await supabase
      .from('companies')
      .update({ verified, verified_at: verified ? new Date().toISOString() : null })
      .eq('id', companyId);

    if (!error) {
      toast.success(verified ? 'Entreprise vérifiée' : 'Vérification retirée');
      fetchCompanies();
    }
  };

  const handleReport = async (reportId: string, status: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ 
        status, 
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id 
      })
      .eq('id', reportId);

    if (!error) {
      toast.success(`Signalement ${status === 'resolved' ? 'résolu' : 'rejeté'}`);
      fetchReports();
      fetchStats();
    }
  };

  const addTeamMember = async (userId: string, role: string) => {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: role as any });

    if (!error) {
      toast.success('Membre ajouté à l\'équipe');
      fetchTeamMembers();
    } else {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const removeTeamMember = async (roleId: string) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (!error) {
      toast.success('Membre retiré de l\'équipe');
      fetchTeamMembers();
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pt-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Administration</h1>
            <p className="text-muted-foreground">Panneau de contrôle de la plateforme</p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Shield className="w-4 h-4" />
            Super Admin
          </Badge>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-6 mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Tableau de bord</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="companies" className="gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Entreprises</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Signalements</span>
              {stats?.pendingReports ? (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                  {stats.pendingReports}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Équipe</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Utilisateurs</CardDescription>
                  <CardTitle className="text-3xl">{stats?.totalUsers || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    {stats?.activeUsers || 0} en ligne
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Entreprises</CardDescription>
                  <CardTitle className="text-3xl">{stats?.totalCompanies || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-green-600">
                    <Check className="w-4 h-4 mr-1" />
                    {stats?.verifiedCompanies || 0} vérifiées
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Publications</CardDescription>
                  <CardTitle className="text-3xl">{stats?.totalPosts || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Cette semaine
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Offres d'emploi</CardDescription>
                  <CardTitle className="text-3xl">{stats?.totalJobs || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Activity className="w-4 h-4 mr-1" />
                    Actives
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {users.slice(0, 10).map((u) => (
                      <div key={u.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatar_url || ''} />
                          <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Inscrit {new Date(u.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {u.is_online && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Signalements en attente</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {reports.filter(r => r.status === 'pending').slice(0, 10).map((report) => (
                      <div key={report.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{report.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.content_type} • {new Date(report.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleReport(report.id, 'resolved')}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleReport(report.id, 'rejected')}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gestion des utilisateurs</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Région</TableHead>
                        <TableHead>Inscrit le</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={u.avatar_url || ''} />
                                <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{u.full_name}</p>
                                <p className="text-xs text-muted-foreground">@{u.username}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{u.region || '-'}</TableCell>
                          <TableCell>{new Date(u.created_at).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>
                            {u.is_online ? (
                              <Badge variant="outline" className="text-green-600">En ligne</Badge>
                            ) : (
                              <Badge variant="secondary">Hors ligne</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                                <Ban className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gestion des entreprises</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Secteur</TableHead>
                        <TableHead>Créée le</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={company.logo_url || ''} />
                                <AvatarFallback>{company.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{company.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{company.sector || '-'}</TableCell>
                          <TableCell>{new Date(company.created_at).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>
                            {company.verified ? (
                              <Badge className="bg-green-500">Vérifiée</Badge>
                            ) : (
                              <Badge variant="secondary">En attente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {company.verified ? (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-600"
                                  onClick={() => verifyCompany(company.id, false)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-green-600"
                                  onClick={() => verifyCompany(company.id, true)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Signalements</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <Badge variant="outline">{report.content_type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{report.reason}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {report.description || '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(report.created_at).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                report.status === 'resolved' ? 'default' :
                                report.status === 'rejected' ? 'secondary' : 'destructive'
                              }
                            >
                              {report.status === 'pending' ? 'En attente' :
                               report.status === 'resolved' ? 'Résolu' : 'Rejeté'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {report.status === 'pending' && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600"
                                  onClick={() => handleReport(report.id, 'resolved')}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Résoudre
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  onClick={() => handleReport(report.id, 'rejected')}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Rejeter
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Équipe de modération</CardTitle>
                    <CardDescription>Gérez les rôles et permissions de l'équipe</CardDescription>
                  </div>
                  <AddTeamMemberDialog users={users} onAdd={addTeamMember} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {teamMembers.map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={member.profiles?.avatar_url} />
                          <AvatarFallback>
                            {member.profiles?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{member.profiles?.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={
                            member.role === 'super_admin' ? 'default' :
                            member.role === 'admin' ? 'secondary' : 'outline'
                          }
                        >
                          {member.role === 'super_admin' ? 'Super Admin' :
                           member.role === 'admin' ? 'Admin' : 'Modérateur'}
                        </Badge>
                        {member.role !== 'super_admin' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeTeamMember(member.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres généraux</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Nom de la plateforme</Label>
                    <Input defaultValue="Ivoi'Rois" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea 
                      defaultValue="Le réseau social professionnel de Côte d'Ivoire"
                      rows={3}
                    />
                  </div>
                  <Button>Enregistrer les modifications</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Modération automatique</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Filtre anti-spam</p>
                      <p className="text-sm text-muted-foreground">
                        Détecte et bloque automatiquement le spam
                      </p>
                    </div>
                    <Button variant="outline">Configurer</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Filtre de contenu</p>
                      <p className="text-sm text-muted-foreground">
                        Bloque le contenu inapproprié
                      </p>
                    </div>
                    <Button variant="outline">Configurer</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <MobileNav />
    </div>
  );
};

// Dialog component for adding team members
const AddTeamMemberDialog = ({ 
  users, 
  onAdd 
}: { 
  users: UserProfile[]; 
  onAdd: (userId: string, role: string) => void;
}) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('moderator');
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (selectedUser) {
      onAdd(selectedUser, selectedRole);
      setOpen(false);
      setSelectedUser('');
      setSelectedRole('moderator');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Users className="w-4 h-4 mr-2" />
          Ajouter un membre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un membre à l'équipe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Utilisateur</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {users.slice(0, 20).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name} (@{u.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moderator">Modérateur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} className="w-full" disabled={!selectedUser}>
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAdmin;
