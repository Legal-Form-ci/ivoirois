import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, FolderKanban, Upload } from "lucide-react";
import { toast } from "sonner";

interface Company { id: string; name: string; }

const CreateProject = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    status: "active",
    location: "",
    website: "",
    cover_image: "",
    company_id: "none",
    is_public: true,
  });

  useEffect(() => {
    fetchCompanies();
    if (projectId) fetchProject();
  }, [projectId, user]);

  const fetchCompanies = async () => {
    if (!user) return;
    const { data } = await supabase.from("companies").select("id, name").eq("created_by", user.id).order("name");
    setCompanies(data || []);
  };

  const fetchProject = async () => {
    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
    if (error || !data) return;
    setFormData({
      title: data.title || "",
      description: data.description || "",
      category: data.category || "",
      status: data.status || "active",
      location: data.location || "",
      website: data.website || "",
      cover_image: data.cover_image || "",
      company_id: data.company_id || "none",
      is_public: data.is_public ?? true,
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Veuillez sélectionner une image");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/project-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("posts").upload(path, file, { upsert: true });
    if (error) return toast.error("Upload impossible");
    const { data } = await supabase.storage.from("posts").createSignedUrl(path, 3600);
    if (data?.signedUrl) setFormData({ ...formData, cover_image: data.signedUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim()) return;
    setLoading(true);
    try {
      await supabase.rpc("ensure_my_profile");
      const payload = {
        created_by: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        status: formData.status,
        location: formData.location.trim() || null,
        website: formData.website.trim() || null,
        cover_image: formData.cover_image.trim() || null,
        company_id: formData.company_id === "none" ? null : formData.company_id,
        is_public: formData.is_public,
      };

      const query = projectId
        ? supabase.from("projects").update(payload).eq("id", projectId)
        : supabase.from("projects").insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast.success(projectId ? "Projet mis à jour" : "Projet créé");
      navigate("/projects");
    } catch (error: any) {
      toast.error(error.message || "Enregistrement impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-4 md:py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/projects")}><ArrowLeft className="h-4 w-4" />Retour aux projets</Button>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FolderKanban className="h-5 w-5" />{projectId ? "Modifier le projet" : "Créer un projet"}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2"><Label>Titre *</Label><Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea rows={5} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Catégorie</Label><Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Statut</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="draft">Brouillon</SelectItem><SelectItem value="completed">Terminé</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>Entreprise liée</Label><Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Aucune</SelectItem>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Localisation</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Site web</Label><Input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Couverture</Label>{formData.cover_image && <img src={formData.cover_image} alt="Couverture" className="h-36 w-full object-cover rounded-lg" />}<Button type="button" variant="outline" className="gap-2" onClick={() => document.getElementById("project-cover")?.click()}><Upload className="h-4 w-4" />Télécharger</Button><input id="project-cover" type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} /></div>
                <div className="flex items-center justify-between rounded-lg border p-3"><Label>Projet public</Label><Switch checked={formData.is_public} onCheckedChange={(v) => setFormData({ ...formData, is_public: v })} /></div>
                <Button type="submit" disabled={loading} className="w-full">{loading ? "Enregistrement..." : projectId ? "Mettre à jour" : "Créer"}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default CreateProject;