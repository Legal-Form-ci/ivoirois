import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X, Award, Languages, Link as LinkIcon } from 'lucide-react';

interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  location: string;
}

interface Education {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  grade: string;
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
  url: string;
}

interface Language {
  name: string;
  level: string;
}

interface Project {
  name: string;
  description: string;
  url: string;
  technologies: string[];
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
    certifications: [] as Certification[],
    languages: [] as Language[],
    projects: [] as Project[],
    interests: [] as string[],
    references: '',
    is_public: false,
    is_primary: false,
  });
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData({ ...formData, interests: [...formData.interests, newInterest.trim()] });
      setNewInterest('');
    }
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
        location: '',
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
        grade: '',
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

  const addCertification = () => {
    setFormData({
      ...formData,
      certifications: [...formData.certifications, {
        name: '',
        issuer: '',
        date: '',
        url: '',
      }],
    });
  };

  const updateCertification = (index: number, field: keyof Certification, value: string) => {
    const updated = [...formData.certifications];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, certifications: updated });
  };

  const removeCertification = (index: number) => {
    setFormData({ ...formData, certifications: formData.certifications.filter((_, i) => i !== index) });
  };

  const addLanguage = () => {
    setFormData({
      ...formData,
      languages: [...formData.languages, { name: '', level: 'intermediate' }],
    });
  };

  const updateLanguage = (index: number, field: keyof Language, value: string) => {
    const updated = [...formData.languages];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, languages: updated });
  };

  const removeLanguage = (index: number) => {
    setFormData({ ...formData, languages: formData.languages.filter((_, i) => i !== index) });
  };

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, {
        name: '',
        description: '',
        url: '',
        technologies: [],
      }],
    });
  };

  const updateProject = (index: number, field: keyof Project, value: string | string[]) => {
    const updated = [...formData.projects];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, projects: updated });
  };

  const removeProject = (index: number) => {
    setFormData({ ...formData, projects: formData.projects.filter((_, i) => i !== index) });
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
          certifications: formData.certifications,
          languages: formData.languages,
          projects: formData.projects,
          interests: formData.interests,
          references: formData.references,
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
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-4 md:py-6">
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
            {/* General Info */}
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
                    placeholder="Ex: Développeur Full Stack Senior"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Résumé professionnel</Label>
                  <Textarea
                    id="summary"
                    rows={4}
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Décrivez votre profil, vos objectifs et ce qui vous rend unique..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>CV public</Label>
                      <p className="text-xs text-muted-foreground">
                        Visible par les recruteurs
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>CV principal</Label>
                      <p className="text-xs text-muted-foreground">
                        Affiché sur votre profil
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_primary}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
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

            {/* Experience */}
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
                        <Label>Entreprise *</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => updateExperience(index, 'company', e.target.value)}
                          placeholder="Nom de l'entreprise"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Poste *</Label>
                        <Input
                          value={exp.position}
                          onChange={(e) => updateExperience(index, 'position', e.target.value)}
                          placeholder="Intitulé du poste"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Lieu</Label>
                        <Input
                          value={exp.location}
                          onChange={(e) => updateExperience(index, 'location', e.target.value)}
                          placeholder="Ville, Pays"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Période</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="month"
                            value={exp.startDate}
                            onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                          />
                          <span>-</span>
                          <Input
                            type="month"
                            value={exp.endDate}
                            onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                            disabled={exp.current}
                            placeholder={exp.current ? "Présent" : ""}
                          />
                        </div>
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
                      <Label>Description des responsabilités</Label>
                      <Textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(index, 'description', e.target.value)}
                        placeholder="Décrivez vos responsabilités, réalisations et compétences utilisées..."
                        rows={4}
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

            {/* Education */}
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
                        <Label>École / Université *</Label>
                        <Input
                          value={edu.school}
                          onChange={(e) => updateEducation(index, 'school', e.target.value)}
                          placeholder="Nom de l'établissement"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Diplôme *</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                          placeholder="Ex: Licence, Master, Doctorat..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Domaine d'étude</Label>
                        <Input
                          value={edu.field}
                          onChange={(e) => updateEducation(index, 'field', e.target.value)}
                          placeholder="Ex: Informatique, Gestion..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mention / Note</Label>
                        <Input
                          value={edu.grade}
                          onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                          placeholder="Ex: Très bien, 16/20..."
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
                            min="1950"
                            max="2030"
                          />
                          <Input
                            type="number"
                            value={edu.endDate}
                            onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                            placeholder="Fin"
                            min="1950"
                            max="2030"
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

            {/* Certifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certifications
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.certifications.map((cert, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeCertification(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nom de la certification</Label>
                        <Input
                          value={cert.name}
                          onChange={(e) => updateCertification(index, 'name', e.target.value)}
                          placeholder="Ex: AWS Solutions Architect"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Organisme</Label>
                        <Input
                          value={cert.issuer}
                          onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                          placeholder="Ex: Amazon Web Services"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date d'obtention</Label>
                        <Input
                          type="month"
                          value={cert.date}
                          onChange={(e) => updateCertification(index, 'date', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL de vérification</Label>
                        <Input
                          value={cert.url}
                          onChange={(e) => updateCertification(index, 'url', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.certifications.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Aucune certification ajoutée
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Langues
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.languages.map((lang, index) => (
                  <div key={index} className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Langue</Label>
                      <Input
                        value={lang.name}
                        onChange={(e) => updateLanguage(index, 'name', e.target.value)}
                        placeholder="Ex: Français, Anglais..."
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Niveau</Label>
                      <Select
                        value={lang.level}
                        onValueChange={(value) => updateLanguage(index, 'level', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Débutant</SelectItem>
                          <SelectItem value="intermediate">Intermédiaire</SelectItem>
                          <SelectItem value="advanced">Avancé</SelectItem>
                          <SelectItem value="fluent">Courant</SelectItem>
                          <SelectItem value="native">Natif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLanguage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.languages.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Aucune langue ajoutée
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Projets
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addProject}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.projects.map((project, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeProject(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nom du projet</Label>
                        <Input
                          value={project.name}
                          onChange={(e) => updateProject(index, 'name', e.target.value)}
                          placeholder="Nom du projet"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          value={project.url}
                          onChange={(e) => updateProject(index, 'url', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={project.description}
                        onChange={(e) => updateProject(index, 'description', e.target.value)}
                        placeholder="Décrivez le projet..."
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
                {formData.projects.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Aucun projet ajouté
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Interests */}
            <Card>
              <CardHeader>
                <CardTitle>Centres d'intérêt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Ajouter un centre d'intérêt"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  />
                  <Button type="button" onClick={addInterest}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest) => (
                    <span
                      key={interest}
                      className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                      {interest}
                      <button type="button" onClick={() => setFormData({ ...formData, interests: formData.interests.filter(i => i !== interest) })}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* References */}
            <Card>
              <CardHeader>
                <CardTitle>Références</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.references}
                  onChange={(e) => setFormData({ ...formData, references: e.target.value })}
                  placeholder="Ajoutez vos références ou indiquez 'Disponibles sur demande'..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <div className="flex gap-2 sticky bottom-20 md:bottom-4 bg-background/95 backdrop-blur p-4 -mx-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/resume')}
                disabled={loading}
                className="flex-1"
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
      <MobileNav />
    </div>
  );
};

export default CreateResume;
