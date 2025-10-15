import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { 
  REGIONS_COTE_IVOIRE, 
  SECTORS, 
  EDUCATION_LEVELS, 
  EXPERIENCE_LEVELS,
  MARITAL_STATUS,
  RELIGIONS 
} from "@/constants/regions";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  phone_number?: string;
  region?: string;
  profession?: string;
  sector?: string;
  position?: string;
  experience_level?: string;
  years_of_experience?: number;
  education_level?: string;
  marital_status?: string;
  religion?: string;
  interests?: string[];
}

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    bio: "",
    location: "",
    avatar_url: "",
    phone_number: "",
    region: "",
    profession: "",
    sector: "",
    position: "",
    experience_level: "",
    years_of_experience: 0,
    education_level: "",
    marital_status: "",
    religion: "",
    interests: [] as string[],
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        username: data.username || "",
        bio: data.bio || "",
        location: data.location || "",
        avatar_url: data.avatar_url || "",
        phone_number: data.phone_number || "",
        region: data.region || "",
        profession: data.profession || "",
        sector: data.sector || "",
        position: data.position || "",
        experience_level: data.experience_level || "",
        years_of_experience: data.years_of_experience || 0,
        education_level: data.education_level || "",
        marital_status: data.marital_status || "",
        religion: data.religion || "",
        interests: data.interests || [],
      });
    } catch (error: any) {
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

      setFormData({ ...formData, avatar_url: data.publicUrl });
      toast.success("Photo téléchargée avec succès");
    } catch (error: any) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim(),
          username: formData.username.trim(),
          bio: formData.bio.trim(),
          location: formData.location.trim(),
          avatar_url: formData.avatar_url.trim() || null,
          phone_number: formData.phone_number.trim() || null,
          region: formData.region || null,
          profession: formData.profession.trim() || null,
          sector: formData.sector || null,
          position: formData.position.trim() || null,
          experience_level: formData.experience_level || null,
          years_of_experience: formData.years_of_experience || null,
          education_level: formData.education_level || null,
          marital_status: formData.marital_status || null,
          religion: formData.religion || null,
          interests: formData.interests.length > 0 ? formData.interests : null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil mis à jour avec succès");
      navigate(`/profile/${user.id}`);
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate(`/profile/${user?.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au profil
          </Button>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Modifier mon profil</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={formData.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {formData.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="w-full space-y-2">
                    <Label htmlFor="avatar_file">Télécharger une photo</Label>
                    <Input
                      id="avatar_file"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                    {uploading && (
                      <p className="text-sm text-muted-foreground">
                        Téléchargement en cours...
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet *</Label>
                  <Input
                    id="full_name"
                    required
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur *</Label>
                  <Input
                    id="username"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biographie</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    placeholder="Parlez-nous de vous..."
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input
                    id="location"
                    placeholder="Abidjan, Côte d'Ivoire"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Numéro de téléphone</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="0759566087"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Région</Label>
                  <Select 
                    value={formData.region} 
                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre région" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS_COTE_IVOIRE.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession">Profession / Activité</Label>
                  <Input
                    id="profession"
                    placeholder="Développeur, Commerçant, etc."
                    value={formData.profession}
                    onChange={(e) =>
                      setFormData({ ...formData, profession: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sector">Secteur d'activité</Label>
                  <Select 
                    value={formData.sector} 
                    onValueChange={(value) => setFormData({ ...formData, sector: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un secteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Poste</Label>
                  <Input
                    id="position"
                    placeholder="Directeur, Manager, etc."
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience_level">Niveau d'expérience</Label>
                  <Select 
                    value={formData.experience_level} 
                    onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years_of_experience">Années d'expérience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    min="0"
                    placeholder="5"
                    value={formData.years_of_experience}
                    onChange={(e) =>
                      setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education_level">Niveau d'études</Label>
                  <Select 
                    value={formData.education_level} 
                    onValueChange={(value) => setFormData({ ...formData, education_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre diplôme" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marital_status">Statut matrimonial</Label>
                  <Select 
                    value={formData.marital_status} 
                    onValueChange={(value) => setFormData({ ...formData, marital_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="religion">Religion</Label>
                  <Select 
                    value={formData.religion} 
                    onValueChange={(value) => setFormData({ ...formData, religion: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre religion" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELIGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/profile/${user?.id}`)}
                    disabled={saving}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EditProfile;
