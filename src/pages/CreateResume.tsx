import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X } from 'lucide-react';

interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface Education {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

const CreateResume = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    skills: [] as string[],
    experience: [] as Experience[],
    education: [] as Education[],
    is_public: false,
    is_primary: false,
  });
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experience: [...formData.experience, {
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
      }],
    });
  };

  const updateExperience = (index: number, field: keyof Experience, value: string | boolean) => {
    const updated = [...formData.experience];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, experience: updated });
  };

  const removeExperience = (index: number) => {
    setFormData({ ...formData, experience: formData.experience.filter((_, i) => i !== index) });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, {
        school: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
      }],
    });
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...formData.education];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, education: updated });
  };

  const removeEducation = (index: number) => {
    setFormData({ ...formData, education: formData.education.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('resumes' as any)
        .insert({
          user_id: user.id,
          title: formData.title,
          summary: formData.summary,
          skills: formData.skills,
          experience: formData.experience,
          education: formData.education,
          is_public: formData.is_public,
          is_primary: formData.is_primary,
        });

      if (error) throw error;

      toast.success('CV créé avec succès !');
      navigate('/resume');
    } catch (error: any) {
      toast.error('Erreur lors de la création du CV');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-6">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate('/resume')}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux CV
          </Button>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du CV *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Développeur Full Stack"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Résumé professionnel</Label>
                  <Textarea
                    id="summary"
                    rows={4}
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Décrivez votre profil en quelques lignes..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>CV public</Label>
                    <p className="text-sm text-muted-foreground">
                      Visible par les recruteurs
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>CV principal</Label>
                    <p className="text-sm text-muted-foreground">
                      Affiché sur votre profil
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_primary}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compétences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Ajouter une compétence"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" onClick={addSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Expériences professionnelles</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addExperience}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.experience.map((exp, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeExperience(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Entreprise</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => updateExperience(index, 'company', e.target.value)}
                          placeholder="Nom de l'entreprise"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Poste</Label>
                        <Input
                          value={exp.position}
                          onChange={(e) => updateExperience(index, 'position', e.target.value)}
                          placeholder="Intitulé du poste"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date de début</Label>
                        <Input
                          type="month"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date de fin</Label>
                        <Input
                          type="month"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                          disabled={exp.current}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={exp.current}
                        onCheckedChange={(checked) => updateExperience(index, 'current', checked)}
                      />
                      <Label>Poste actuel</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(index, 'description', e.target.value)}
                        placeholder="Décrivez vos responsabilités..."
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
                {formData.experience.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Aucune expérience ajoutée
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Formation</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addEducation}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.education.map((edu, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeEducation(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>École / Université</Label>
                        <Input
                          value={edu.school}
                          onChange={(e) => updateEducation(index, 'school', e.target.value)}
                          placeholder="Nom de l'établissement"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Diplôme</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                          placeholder="Ex: Licence, Master..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Domaine</Label>
                        <Input
                          value={edu.field}
                          onChange={(e) => updateEducation(index, 'field', e.target.value)}
                          placeholder="Ex: Informatique"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Années</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={edu.startDate}
                            onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                            placeholder="Début"
                          />
                          <Input
                            type="number"
                            value={edu.endDate}
                            onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                            placeholder="Fin"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {formData.education.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Aucune formation ajoutée
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/resume')}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Création...' : 'Créer le CV'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateResume;
