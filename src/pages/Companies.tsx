import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  description: string;
  industry: string;
  logo_url?: string;
  verified: boolean;
  region?: string;
  profiles?: {
    full_name: string;
  };
}

const Companies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("companies")
        .select(`
          id,
          name,
          description,
          industry,
          logo_url,
          verified,
          region,
          profiles:owner_id (full_name)
        `)
        .order("verified", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies((data as any) || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des entreprises");
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                Entreprises
              </h1>
              <p className="text-muted-foreground mt-1">
                Découvrez les entreprises vérifiées sur Ivoi'Rois
              </p>
            </div>
            <Button onClick={() => navigate("/companies/create")} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une entreprise
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Aucune entreprise trouvée</p>
              <p className="text-muted-foreground mb-4">
                Soyez le premier à créer votre entreprise sur Ivoi'Rois !
              </p>
              <Button onClick={() => navigate("/companies/create")}>
                Créer une entreprise
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCompanies.map((company) => (
                <Card
                  key={company.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={company.logo_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                          {company.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="truncate">{company.name}</span>
                          {company.verified && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </CardTitle>
                        {company.industry && (
                          <Badge variant="secondary" className="mt-1">
                            {company.industry}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {company.description || "Aucune description disponible"}
                    </p>
                    {company.region && (
                      <p className="text-xs text-muted-foreground mt-2">
                        📍 {company.region}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Companies;
