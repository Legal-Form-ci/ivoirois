import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Award, Download } from "lucide-react";
import appLogo from "@/assets/envle-space-logo.png.asset.json";

const CertificateView = () => {
  const { number } = useParams();
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("*, courses(title, instructor_id, profiles!courses_instructor_id_fkey(full_name)), profiles!certificates_user_id_fkey(full_name)")
        .eq("certificate_number", number)
        .maybeSingle();
      setCert(data);
      setLoading(false);
    })();
  }, [number]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!cert) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Certificat introuvable.</div>;

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="print:shadow-none">
          <CardContent className="pt-10 pb-10 text-center space-y-6 bg-gradient-to-br from-background via-background to-muted">
            <img src={appLogo.url} alt="E'nvlé Space" className="h-20 w-20 mx-auto" />
            <div className="flex items-center justify-center gap-2 text-primary">
              <Award className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Certificat de réussite</h1>
            </div>
            <p className="text-muted-foreground">Ceci certifie que</p>
            <p className="text-2xl font-bold">{cert.profiles?.full_name || "Apprenant"}</p>
            <p className="text-muted-foreground">a terminé avec succès le cours</p>
            <p className="text-xl font-semibold">« {cert.courses?.title} »</p>
            <p className="text-sm text-muted-foreground">dispensé par {cert.courses?.profiles?.full_name || "l'instructeur"} sur E'nvlé Space</p>
            <div className="pt-6 border-t space-y-1 text-sm">
              <p><span className="text-muted-foreground">N° de certificat :</span> <span className="font-mono">{cert.certificate_number}</span></p>
              <p><span className="text-muted-foreground">Délivré le :</span> {new Date(cert.issued_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-center print:hidden">
          <Button onClick={() => window.print()}><Download className="h-4 w-4 mr-2" />Télécharger / Imprimer</Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateView;