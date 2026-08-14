import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgePill } from "@/components/UserBadges";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandler";
import { Play, Save, Plus } from "lucide-react";

interface BadgeDef {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tier: string;
  is_special: boolean;
  auto_assign: boolean;
  active: boolean;
  rules: Record<string, unknown>;
  position: number;
}

interface HistoryRow {
  id: string;
  user_id: string;
  badge_code: string | null;
  action: string;
  created_at: string;
}

const emptyBadge = {
  code: "",
  name: "",
  description: "",
  icon: "award",
  color: "#D4AF37",
  tier: "standard",
  auto_assign: false,
  active: true,
  rules: "{}",
};

const AdminBadges = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [creating, setCreating] = useState(emptyBadge);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(!!data?.some((r) => r.role === "super_admin" || r.role === "admin"));
    })();
  }, [user]);

  const load = async () => {
    const [{ data: defs }, { data: hist }] = await Promise.all([
      supabase.from("badge_definitions").select("*").order("position"),
      supabase.from("badge_history").select("id, user_id, badge_code, action, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setBadges((defs as unknown as BadgeDef[]) || []);
    setHistory((hist as unknown as HistoryRow[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateBadge = async (b: BadgeDef, patch: Partial<BadgeDef>) => {
    try {
      const { error } = await supabase.from("badge_definitions").update(patch as never).eq("id", b.id);
      if (error) throw error;
      setBadges((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...patch } : x)));
      toast.success("Badge mis à jour");
    } catch (e) {
      toast.error(handleError(e));
    }
  };

  const createBadge = async () => {
    try {
      const rules = JSON.parse(creating.rules || "{}");
      const { error } = await supabase.from("badge_definitions").insert({ ...creating, rules } as never);
      if (error) throw error;
      setCreating(emptyBadge);
      toast.success("Badge créé");
      load();
    } catch (e) {
      toast.error(handleError(e));
    }
  };

  const runEngine = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc("run_badge_engine", { _user_id: null } as never);
      if (error) throw error;
      toast.success(`Moteur exécuté : ${data ?? 0} badge(s) attribué(s)`);
      load();
    } catch (e) {
      toast.error(handleError(e));
    } finally {
      setRunning(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container py-10">
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-6 text-center text-muted-foreground">Accès réservé aux administrateurs.</CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main id="main-content" className="container max-w-screen-xl py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Badges & récompenses</h1>
            <p className="text-sm text-muted-foreground">Règles configurables, attribution automatique et historique.</p>
          </div>
          <Button onClick={runEngine} disabled={running}>
            <Play className="h-4 w-4 mr-2" />
            {running ? "Exécution..." : "Lancer le moteur"}
          </Button>
        </div>

        <Tabs defaultValue="definitions">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="definitions" className="flex-1 sm:flex-none">Badges</TabsTrigger>
            <TabsTrigger value="create" className="flex-1 sm:flex-none">Créer</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 sm:flex-none">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="definitions" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {badges.map((b) => (
              <Card key={b.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <BadgePill badge={b} size="md" />
                    <span className="text-xs text-muted-foreground uppercase">{b.tier}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground break-words">{b.description}</p>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(b.rules, null, 0)}</pre>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`auto-${b.id}`} className="text-sm">Attribution auto</Label>
                    <Switch id={`auto-${b.id}`} checked={b.auto_assign} onCheckedChange={(v) => updateBadge(b, { auto_assign: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`active-${b.id}`} className="text-sm">Actif</Label>
                    <Switch id={`active-${b.id}`} checked={b.active} onCheckedChange={(v) => updateBadge(b, { active: v })} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="create" className="mt-4">
            <Card className="max-w-2xl">
              <CardHeader><CardTitle className="text-base">Nouveau badge</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label htmlFor="code">Code</Label><Input id="code" value={creating.code} onChange={(e) => setCreating({ ...creating, code: e.target.value })} /></div>
                  <div><Label htmlFor="name">Nom</Label><Input id="name" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} /></div>
                  <div><Label htmlFor="icon">Icône</Label><Input id="icon" value={creating.icon} onChange={(e) => setCreating({ ...creating, icon: e.target.value })} /></div>
                  <div><Label htmlFor="color">Couleur</Label><Input id="color" value={creating.color} onChange={(e) => setCreating({ ...creating, color: e.target.value })} /></div>
                </div>
                <div><Label htmlFor="desc">Description</Label><Input id="desc" value={creating.description} onChange={(e) => setCreating({ ...creating, description: e.target.value })} /></div>
                <div>
                  <Label htmlFor="rules">Règles (JSON)</Label>
                  <Textarea id="rules" rows={4} value={creating.rules} onChange={(e) => setCreating({ ...creating, rules: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">Clés supportées : min_posts, min_friends, min_courses, joined_before, has_role, profile_complete.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="auto-new" checked={creating.auto_assign} onCheckedChange={(v) => setCreating({ ...creating, auto_assign: v })} />
                  <Label htmlFor="auto-new">Attribution automatique</Label>
                </div>
                <Button onClick={createBadge}><Plus className="h-4 w-4 mr-2" />Créer le badge</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0 divide-y">
                {history.length === 0 && <p className="p-6 text-sm text-muted-foreground">Aucun changement enregistré.</p>}
                {history.map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span className="font-medium break-all">{h.badge_code || "—"}</span>
                    <span className="text-muted-foreground">{h.action}</span>
                    <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminBadges;
