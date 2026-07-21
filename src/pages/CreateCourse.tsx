import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Save, ChevronDown, ChevronUp } from "lucide-react";

interface Question { id?: string; question: string; options: string[]; correct_index: number; explanation?: string; points: number; position: number; }
interface Quiz { id?: string; title: string; passing_score: number; is_final: boolean; questions: Question[]; }
interface Lesson { id?: string; title: string; content?: string; video_url?: string; duration_minutes: number; is_preview: boolean; position: number; }
interface Module { id?: string; title: string; position: number; lessons: Lesson[]; }

const CreateCourse = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState({
    title: "", short_description: "", description: "", category: "", level: "beginner",
    language: "fr", price: 0, currency: "XOF", cover_url: "", published: false,
  });
  const [modules, setModules] = useState<Module[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).single();
      if (c) setCourse({ ...course, ...c });
      const { data: mods } = await supabase.from("course_modules").select("*").eq("course_id", courseId).order("position");
      if (mods) {
        const withLessons: Module[] = await Promise.all(mods.map(async (m: any) => {
          const { data: ls } = await supabase.from("lessons").select("*").eq("module_id", m.id).order("position");
          return { ...m, lessons: (ls as Lesson[]) || [] };
        }));
        setModules(withLessons);
      }
      const { data: qzs } = await supabase.from("quizzes").select("*").eq("course_id", courseId);
      if (qzs) {
        const withQs: Quiz[] = await Promise.all(qzs.map(async (q: any) => {
          const { data: qs } = await supabase.from("quiz_questions").select("*").eq("quiz_id", q.id).order("position");
          return { ...q, questions: (qs || []).map((x: any) => ({ ...x, options: Array.isArray(x.options) ? x.options : [] })) };
        }));
        setQuizzes(withQs);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const addModule = () => setModules([...modules, { title: "", position: modules.length, lessons: [] }]);
  const removeModule = (i: number) => setModules(modules.filter((_, k) => k !== i));
  const addLesson = (mi: number) => {
    const m = [...modules];
    m[mi].lessons.push({ title: "", content: "", video_url: "", duration_minutes: 0, is_preview: false, position: m[mi].lessons.length });
    setModules(m);
  };
  const removeLesson = (mi: number, li: number) => {
    const m = [...modules]; m[mi].lessons.splice(li, 1); setModules(m);
  };

  const addQuiz = () => setQuizzes([...quizzes, { title: "", passing_score: 70, is_final: false, questions: [] }]);
  const removeQuiz = (i: number) => setQuizzes(quizzes.filter((_, k) => k !== i));
  const addQuestion = (qi: number) => {
    const q = [...quizzes];
    q[qi].questions.push({ question: "", options: ["", "", "", ""], correct_index: 0, points: 1, position: q[qi].questions.length });
    setQuizzes(q);
  };

  const save = async () => {
    if (!user) return;
    if (!course.title.trim()) { toast.error("Titre requis"); return; }
    setSaving(true);
    try {
      let cId = courseId;
      if (cId) {
        await supabase.from("courses").update({ ...course }).eq("id", cId);
      } else {
        const { data, error } = await supabase.from("courses").insert({ ...course, instructor_id: user.id }).select().single();
        if (error) throw error;
        cId = data.id;
      }

      // Sync modules & lessons (simple upsert-by-replace approach)
      await supabase.from("course_modules").delete().eq("course_id", cId);
      for (const [mi, m] of modules.entries()) {
        const { data: newMod, error: mErr } = await supabase
          .from("course_modules")
          .insert({ course_id: cId, title: m.title, position: mi })
          .select().single();
        if (mErr) throw mErr;
        for (const [li, l] of m.lessons.entries()) {
          await supabase.from("lessons").insert({
            course_id: cId, module_id: newMod.id,
            title: l.title, content: l.content, video_url: l.video_url,
            duration_minutes: Number(l.duration_minutes) || 0,
            is_preview: l.is_preview, position: li,
          });
        }
      }

      // Sync quizzes
      await supabase.from("quizzes").delete().eq("course_id", cId);
      for (const q of quizzes) {
        const { data: newQ, error: qErr } = await supabase
          .from("quizzes")
          .insert({ course_id: cId, title: q.title, passing_score: Number(q.passing_score) || 70, is_final: q.is_final })
          .select().single();
        if (qErr) throw qErr;
        for (const [qi, qu] of q.questions.entries()) {
          await supabase.from("quiz_questions").insert({
            quiz_id: newQ.id, question: qu.question,
            options: qu.options, correct_index: Number(qu.correct_index) || 0,
            explanation: qu.explanation, points: Number(qu.points) || 1, position: qi,
          });
        }
      }

      toast.success("Cours enregistré");
      navigate(`/learning/${cId}`);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-screen-lg mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button>

          <Card>
            <CardHeader><CardTitle>Informations du cours</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Titre</Label><Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} /></div>
                <div><Label>Catégorie</Label><Input value={course.category} onChange={(e) => setCourse({ ...course, category: e.target.value })} /></div>
              </div>
              <div><Label>Description courte</Label><Input value={course.short_description} onChange={(e) => setCourse({ ...course, short_description: e.target.value })} /></div>
              <div><Label>Description complète</Label><Textarea rows={4} value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} /></div>
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label>Niveau</Label>
                  <Select value={course.level} onValueChange={(v) => setCourse({ ...course, level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Débutant</SelectItem>
                      <SelectItem value="intermediate">Intermédiaire</SelectItem>
                      <SelectItem value="advanced">Avancé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Langue</Label><Input value={course.language} onChange={(e) => setCourse({ ...course, language: e.target.value })} /></div>
                <div><Label>Prix</Label><Input type="number" value={course.price} onChange={(e) => setCourse({ ...course, price: Number(e.target.value) })} /></div>
                <div><Label>Devise</Label><Input value={course.currency} onChange={(e) => setCourse({ ...course, currency: e.target.value })} /></div>
              </div>
              <div><Label>URL image de couverture</Label><Input value={course.cover_url} onChange={(e) => setCourse({ ...course, cover_url: e.target.value })} /></div>
              <div className="flex items-center gap-3">
                <Switch checked={course.published} onCheckedChange={(v) => setCourse({ ...course, published: v })} />
                <Label>Publier le cours</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Programme</CardTitle>
              <Button onClick={addModule} size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter un module</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {modules.map((m, mi) => (
                <div key={mi} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setExpanded({ ...expanded, [mi]: !expanded[mi] })}>
                      {expanded[mi] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Input placeholder={`Module ${mi + 1}`} value={m.title} onChange={(e) => { const n = [...modules]; n[mi].title = e.target.value; setModules(n); }} />
                    <Button variant="ghost" size="icon" onClick={() => removeModule(mi)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  {expanded[mi] !== false && (
                    <div className="pl-8 space-y-2">
                      {m.lessons.map((l, li) => (
                        <div key={li} className="border rounded p-2 space-y-2 bg-muted/30">
                          <div className="flex gap-2">
                            <Input placeholder="Titre de la leçon" value={l.title} onChange={(e) => { const n = [...modules]; n[mi].lessons[li].title = e.target.value; setModules(n); }} />
                            <Input type="number" placeholder="min" className="w-20" value={l.duration_minutes} onChange={(e) => { const n = [...modules]; n[mi].lessons[li].duration_minutes = Number(e.target.value); setModules(n); }} />
                            <Button variant="ghost" size="icon" onClick={() => removeLesson(mi, li)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                          <Input placeholder="URL vidéo (YouTube, Vimeo, MP4...)" value={l.video_url || ""} onChange={(e) => { const n = [...modules]; n[mi].lessons[li].video_url = e.target.value; setModules(n); }} />
                          <Textarea placeholder="Contenu / notes de cours" rows={2} value={l.content || ""} onChange={(e) => { const n = [...modules]; n[mi].lessons[li].content = e.target.value; setModules(n); }} />
                          <div className="flex items-center gap-2 text-sm">
                            <Switch checked={l.is_preview} onCheckedChange={(v) => { const n = [...modules]; n[mi].lessons[li].is_preview = v; setModules(n); }} />
                            Aperçu gratuit
                          </div>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => addLesson(mi)}><Plus className="h-4 w-4 mr-1" />Ajouter une leçon</Button>
                    </div>
                  )}
                </div>
              ))}
              {modules.length === 0 && <p className="text-sm text-muted-foreground">Aucun module. Ajoutez-en un.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quiz & certification</CardTitle>
              <Button onClick={addQuiz} size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter un quiz</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizzes.map((q, qi) => (
                <div key={qi} className="border rounded-lg p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input placeholder="Titre du quiz" value={q.title} onChange={(e) => { const n = [...quizzes]; n[qi].title = e.target.value; setQuizzes(n); }} className="flex-1 min-w-[200px]" />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Score min</Label>
                      <Input type="number" className="w-20" value={q.passing_score} onChange={(e) => { const n = [...quizzes]; n[qi].passing_score = Number(e.target.value); setQuizzes(n); }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={q.is_final} onCheckedChange={(v) => { const n = [...quizzes]; n[qi].is_final = v; setQuizzes(n); }} />
                      <Label className="text-xs">Final</Label>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeQuiz(qi)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  {q.questions.map((qu, quI) => (
                    <div key={quI} className="border rounded p-2 space-y-2 bg-muted/30">
                      <Input placeholder={`Question ${quI + 1}`} value={qu.question} onChange={(e) => { const n = [...quizzes]; n[qi].questions[quI].question = e.target.value; setQuizzes(n); }} />
                      {qu.options.map((op, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" name={`q-${qi}-${quI}`} checked={qu.correct_index === oi} onChange={() => { const n = [...quizzes]; n[qi].questions[quI].correct_index = oi; setQuizzes(n); }} />
                          <Input placeholder={`Option ${oi + 1}`} value={op} onChange={(e) => { const n = [...quizzes]; n[qi].questions[quI].options[oi] = e.target.value; setQuizzes(n); }} />
                        </div>
                      ))}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => addQuestion(qi)}><Plus className="h-4 w-4 mr-1" />Ajouter une question</Button>
                </div>
              ))}
              {quizzes.length === 0 && <p className="text-sm text-muted-foreground">Aucun quiz. Un quiz final délivrera automatiquement un certificat.</p>}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/learning")}>Annuler</Button>
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default CreateCourse;