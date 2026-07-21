import { useEffect, useState } from "react";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ShieldAlert, Globe2, AlertTriangle, Activity } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface Dashboard {
  totalChecks: number;
  blockedChecks: number;
  blockRate: number;
  vpnBlocks: number;
  countryBlocks: number;
  falsePositiveAlerts: number;
  byCountry: { country: string; total: number; blocked: number }[];
  byVerdict: { verdict: string; total: number }[];
  alerts: { country_code: string | null; verdict: string; false_positive_risk: string; total: number; last_seen: string }[];
  hourly: { hour: string; total: number; blocked: number }[];
}

const RANGES: Record<string, number> = { "24h": 1, "7j": 7, "30j": 30 };

const GeoGateDashboard = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [range, setRange] = useState<keyof typeof RANGES>("7j");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["super_admin", "admin"] as any)
        .maybeSingle();
      setIsAdmin(!!role);
    })();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoadingData(true);
      const since = new Date(Date.now() - RANGES[range] * 24 * 60 * 60 * 1000).toISOString();
      const { data: res, error } = await supabase.rpc("get_geogate_dashboard", { p_since: since });
      if (error) {
        toast.error("Impossible de charger le tableau de bord GeoGate");
      } else {
        setData(res as unknown as Dashboard);
      }
      setLoadingData(false);
    })();
  }, [isAdmin, range]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === false) return <Navigate to="/feed" replace />;

  const maxHourly = Math.max(1, ...(data?.hourly?.map((h) => h.total) || [0]));

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-screen-xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Tableau de bord GeoGate</h1>
                <p className="text-sm text-muted-foreground">Statistiques agrégées et anonymisées — aucune donnée personnelle exposée.</p>
              </div>
            </div>
            <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGES)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 heures</SelectItem>
                <SelectItem value="7j">7 jours</SelectItem>
                <SelectItem value="30j">30 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingData || !data ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Chargement...</CardContent></Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Activity className="h-4 w-4" />} label="Vérifications" value={data.totalChecks} />
                <StatCard icon={<ShieldAlert className="h-4 w-4" />} label="Blocages" value={data.blockedChecks} sub={`${data.blockRate}%`} />
                <StatCard icon={<Globe2 className="h-4 w-4" />} label="Pays bloqués" value={data.countryBlocks} />
                <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="VPN/Proxy" value={data.vpnBlocks} sub={`${data.falsePositiveAlerts} alertes faux-positifs`} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Répartition par pays</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {data.byCountry.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                    ) : data.byCountry.map((c) => (
                      <div key={c.country} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono">{c.country}</span>
                          <span className="text-muted-foreground">{c.blocked}/{c.total} bloqués</span>
                        </div>
                        <Progress value={(c.blocked / Math.max(c.total, 1)) * 100} />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Verdicts</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {data.byVerdict.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                    ) : data.byVerdict.map((v) => (
                      <div key={v.verdict} className="flex items-center justify-between text-sm">
                        <Badge variant="outline" className="capitalize">{v.verdict}</Badge>
                        <span className="font-semibold">{v.total}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Alertes faux-positifs</CardTitle></CardHeader>
                <CardContent>
                  {data.alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune alerte détectée sur la période.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground border-b">
                          <tr><th className="py-2 pr-4">Pays</th><th className="py-2 pr-4">Verdict</th><th className="py-2 pr-4">Risque</th><th className="py-2 pr-4">Occurrences</th><th className="py-2">Dernier événement</th></tr>
                        </thead>
                        <tbody>
                          {data.alerts.map((a, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-mono">{a.country_code || "??"}</td>
                              <td className="py-2 pr-4 capitalize">{a.verdict}</td>
                              <td className="py-2 pr-4"><Badge variant={a.false_positive_risk === "high" ? "destructive" : "secondary"}>{a.false_positive_risk}</Badge></td>
                              <td className="py-2 pr-4">{a.total}</td>
                              <td className="py-2 text-muted-foreground">{new Date(a.last_seen).toLocaleString("fr-FR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Trafic horaire (48 dernières entrées)</CardTitle></CardHeader>
                <CardContent>
                  {data.hourly.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                  ) : (
                    <div className="flex items-end gap-1 h-32">
                      {[...data.hourly].reverse().map((h, i) => (
                        <div key={i} className="flex-1 min-w-0 flex flex-col justify-end" title={`${new Date(h.hour).toLocaleString("fr-FR")} — ${h.blocked}/${h.total}`}>
                          <div className="bg-destructive/70 rounded-t" style={{ height: `${(h.blocked / maxHourly) * 100}%` }} />
                          <div className="bg-primary/70" style={{ height: `${((h.total - h.blocked) / maxHourly) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary/70 rounded-sm" />Autorisés</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-destructive/70 rounded-sm" />Bloqués</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <div className="text-2xl font-bold mt-1">{value.toLocaleString("fr-FR")}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </CardContent>
  </Card>
);

export default GeoGateDashboard;